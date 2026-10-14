"""
train_models_weather.py
Compares price-forecast models WITHOUT weather vs WITH weather features.
Both runs use the same weekly rows and the same train/test split, so the
comparison is fair. Nothing is saved to backend/app/models (no pkl changes).

Run from the project root:  python ml_pipeline\\train_models_weather.py
"""

import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "processed"

# Which district's weather to use for each crop (same mapping as the price data)
CROP_DISTRICT = {
    "Groundnut": "Rajkot",
    "Cotton": "Surendranagar",
    "Sesame": "Patan",
    "Wheat": "Sabarkantha",
    "Bajra": "Patan",
    "Castor Seed": "Banaskantha",
    "Chickpea": "Botad",
    "Cumin": "Mehsana",
    "Mustard": "Surendranagar",
}

BASE_FEATURES = ["lag_1", "lag_2", "lag_4", "rolling_mean_4",
                 "rolling_mean_8", "arrivals_lag_1", "month"]
WEATHER_FEATURES = ["rain_lag_1", "rain_4wk", "temp_lag_1", "tmax_lag_1"]


def find_col(df, keywords, label):
    """Find a column by name. Exact match wins; otherwise fall back to 'contains'."""
    # 1) exact match first (so 'commodity' beats 'commodity_group')
    for kw in keywords:
        if kw in df.columns:
            return kw
    # 2) otherwise first column whose name contains a keyword
    for kw in keywords:
        for col in df.columns:
            if kw in col.lower():
                return col
    raise KeyError(f"Could not find the {label} column. Columns are: {list(df.columns)}")


def build_dataset(prices, weather, crop, cols):
    """Weekly table for one crop: price, arrivals, weather -> feature matrix X and target y."""
    date_c, com_c, price_c, arr_c = cols

    # ---- weekly price + arrivals (weeks end on Sunday) ----
    sub = prices[prices[com_c] == crop].set_index(date_c).sort_index()
    weekly = pd.DataFrame({
        "price": sub[price_c].resample("W").mean(),     # average price across mandis
        "arrivals": sub[arr_c].resample("W").sum(),     # total arrivals across mandis
    })
    weekly["price"] = weekly["price"].ffill(limit=2)    # fill short reporting gaps only
    weekly = weekly.dropna(subset=["price"])

    # ---- weekly weather for the crop's district ----
    w = weather[weather["district"] == CROP_DISTRICT[crop]].set_index("date").sort_index()
    wk = pd.DataFrame({
        "rain": w["rainfall_mm"].resample("W").sum(),
        "temp_mean": w["temp_mean"].resample("W").mean(),
        "temp_max": w["temp_max"].resample("W").mean(),
    })
    data = weekly.join(wk, how="left")

    # ---- features (shift(1) everywhere = only information known BEFORE the week) ----
    X = pd.DataFrame(index=data.index)
    X["lag_1"] = data["price"].shift(1)
    X["lag_2"] = data["price"].shift(2)
    X["lag_4"] = data["price"].shift(4)
    X["rolling_mean_4"] = data["price"].shift(1).rolling(4).mean()
    X["rolling_mean_8"] = data["price"].shift(1).rolling(8).mean()
    X["arrivals_lag_1"] = data["arrivals"].shift(1)
    X["month"] = data.index.month

    # weather features: log1p tames extreme storm days (one 328 mm day won't dominate)
    X["rain_lag_1"] = np.log1p(data["rain"].shift(1))
    X["rain_4wk"] = np.log1p(data["rain"].shift(1).rolling(4).sum())
    X["temp_lag_1"] = data["temp_mean"].shift(1)
    X["tmax_lag_1"] = data["temp_max"].shift(1)

    full = X.join(data["price"].rename("target")).dropna()   # same rows for both runs
    return full.drop(columns="target"), full["target"]


def metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    return {"MAE": mae, "RMSE": rmse, "MAPE": mape}


def run_models(X_tr, y_tr, X_te, y_te):
    """Train the 4 models, return {model name: metrics}."""
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42),
        "Gradient Boosting": HistGradientBoostingRegressor(max_depth=6, random_state=42),
    }
    results = {"Baseline": metrics(y_te.values, X_te["lag_1"].values)}  # "same as last week"
    for name, model in models.items():
        model.fit(X_tr, y_tr)
        results[name] = metrics(y_te.values, model.predict(X_te))
    return results


def best(results, ml_only=False):
    """Name and metrics of the model with the lowest MAE."""
    items = {k: v for k, v in results.items() if not (ml_only and k == "Baseline")}
    name = min(items, key=lambda k: items[k]["MAE"])
    return name, items[name]


def main():
    prices = pd.read_parquet(DATA / "mandi_prices_merged.parquet")
    weather = pd.read_parquet(DATA / "weather_daily.parquet")

    # Exact column names are listed first so 'commodity' is chosen over 'commodity_group'
    cols = (
        find_col(prices, ["date"], "date"),
        find_col(prices, ["commodity"], "commodity"),
        find_col(prices, ["modal_price", "modal", "price"], "price"),
        find_col(prices, ["arrival_quantity", "arrival"], "arrivals"),
    )
    print("Columns used (date, commodity, price, arrivals):", cols)
    prices[cols[0]] = pd.to_datetime(prices[cols[0]])

    rows = []
    for crop in CROP_DISTRICT:
        X, y = build_dataset(prices, weather, crop, cols)
        split = int(len(X) * 0.8)                      # chronological 80/20, no shuffling
        X_tr, X_te = X.iloc[:split], X.iloc[split:]
        y_tr, y_te = y.iloc[:split], y.iloc[split:]

        no_w = run_models(X_tr[BASE_FEATURES], y_tr, X_te[BASE_FEATURES], y_te)
        with_w = run_models(X_tr[BASE_FEATURES + WEATHER_FEATURES], y_tr,
                            X_te[BASE_FEATURES + WEATHER_FEATURES], y_te)

        # best ML model only (baseline excluded) - this shows whether weather
        # helps the models, even for crops where the baseline wins overall
        ml_no_name, ml_no = best(no_w, ml_only=True)
        ml_w_name, ml_w = best(with_w, ml_only=True)
        change = (ml_w["MAE"] - ml_no["MAE"]) / ml_no["MAE"] * 100

        rows.append({
            "crop": crop,
            "train_weeks": len(X_tr),
            "test_weeks": len(X_te),
            "best_no_weather": f"{ml_no_name}",
            "MAE_no_weather": round(ml_no["MAE"], 1),
            "MAPE_no_weather": round(ml_no["MAPE"], 2),
            "best_with_weather": f"{ml_w_name}",
            "MAE_with_weather": round(ml_w["MAE"], 1),
            "MAPE_with_weather": round(ml_w["MAPE"], 2),
            "MAE_change_%": round(change, 1),   # negative = weather helped
            "baseline_MAE": round(no_w["Baseline"]["MAE"], 1),
        })

    summary = pd.DataFrame(rows)
    print("\n=== Best ML model per crop: WITHOUT vs WITH weather ===")
    print(summary.to_string(index=False))

    helped = (summary["MAE_change_%"] < 0).sum()
    print(f"\nWeather lowered the error for {helped} of {len(summary)} crops.")
    print(f"Average MAE change: {summary['MAE_change_%'].mean():.1f}%  (negative = better)")

    summary.to_csv(ROOT / "ml_pipeline" / "weather_comparison_summary.csv", index=False)
    print("Saved ml_pipeline\\weather_comparison_summary.csv")


if __name__ == "__main__":
    main()