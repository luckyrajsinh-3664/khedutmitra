"""
train_arrival_weather.py
Compares ARRIVAL (demand) forecast models WITHOUT weather vs WITH weather.
Same weekly rows and same chronological split for both runs, so it is a fair test.
MAE is the main metric (MAPE explodes when weekly arrivals are near zero).
Nothing is saved to backend/app/models.

Run from the project root:  python ml_pipeline\\train_arrival_weather.py
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

# Which district's weather to use for each crop
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

BASE_FEATURES = ["arrivals_lag_1", "arrivals_lag_2", "arrivals_lag_4",
                 "arrivals_rolling_4", "price_lag_1", "month"]
WEATHER_FEATURES = ["rain_lag_1", "rain_4wk", "temp_lag_1", "tmax_lag_1"]


def find_col(df, keywords, label):
    """Exact column name wins; otherwise first column containing a keyword."""
    for kw in keywords:
        if kw in df.columns:
            return kw
    for kw in keywords:
        for col in df.columns:
            if kw in col.lower():
                return col
    raise KeyError(f"Could not find the {label} column. Columns are: {list(df.columns)}")


def build_dataset(prices, weather, crop, cols):
    """Weekly table for one crop -> feature matrix X and target y (weekly arrivals)."""
    date_c, com_c, price_c, arr_c = cols

    # ---- weekly price + arrivals (weeks end on Sunday) ----
    sub = prices[prices[com_c] == crop].set_index(date_c).sort_index()
    weekly = pd.DataFrame({
        "price": sub[price_c].resample("W").mean(),
        "arrivals": sub[arr_c].resample("W").sum(),     # TARGET: total tonnes in the week
    })
    weekly["price"] = weekly["price"].ffill(limit=2)
    weekly = weekly.dropna(subset=["price"])

    # ---- weekly weather for the crop's district ----
    w = weather[weather["district"] == CROP_DISTRICT[crop]].set_index("date").sort_index()
    wk = pd.DataFrame({
        "rain": w["rainfall_mm"].resample("W").sum(),
        "temp_mean": w["temp_mean"].resample("W").mean(),
        "temp_max": w["temp_max"].resample("W").mean(),
    })
    data = weekly.join(wk, how="left")

    # ---- features: shift(1) = only information known BEFORE the week ----
    X = pd.DataFrame(index=data.index)
    X["arrivals_lag_1"] = data["arrivals"].shift(1)
    X["arrivals_lag_2"] = data["arrivals"].shift(2)
    X["arrivals_lag_4"] = data["arrivals"].shift(4)
    X["arrivals_rolling_4"] = data["arrivals"].shift(1).rolling(4).mean()
    X["price_lag_1"] = data["price"].shift(1)
    X["month"] = data.index.month

    X["rain_lag_1"] = np.log1p(data["rain"].shift(1))                    # log1p tames storms
    X["rain_4wk"] = np.log1p(data["rain"].shift(1).rolling(4).sum())
    X["temp_lag_1"] = data["temp_mean"].shift(1)
    X["tmax_lag_1"] = data["temp_max"].shift(1)

    full = X.join(data["arrivals"].rename("target")).dropna()
    return full.drop(columns="target"), full["target"]


def metrics(y_true, y_pred):
    return {
        "MAE": mean_absolute_error(y_true, y_pred),
        "RMSE": np.sqrt(mean_squared_error(y_true, y_pred)),
    }


def run_models(X_tr, y_tr, X_te, y_te):
    """Train the models; return {model name: metrics}."""
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42),
        "Gradient Boosting": HistGradientBoostingRegressor(max_depth=6, random_state=42),
    }
    results = {"Baseline": metrics(y_te.values, X_te["arrivals_lag_1"].values)}
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
        split = int(len(X) * 0.8)                       # chronological 80/20, no shuffling
        X_tr, X_te = X.iloc[:split], X.iloc[split:]
        y_tr, y_te = y.iloc[:split], y.iloc[split:]

        no_w = run_models(X_tr[BASE_FEATURES], y_tr, X_te[BASE_FEATURES], y_te)
        with_w = run_models(X_tr[BASE_FEATURES + WEATHER_FEATURES], y_tr,
                            X_te[BASE_FEATURES + WEATHER_FEATURES], y_te)

        ml_no_name, ml_no = best(no_w, ml_only=True)
        ml_w_name, ml_w = best(with_w, ml_only=True)
        change = (ml_w["MAE"] - ml_no["MAE"]) / ml_no["MAE"] * 100

        rows.append({
            "crop": crop,
            "test_weeks": len(X_te),
            "best_no_weather": ml_no_name,
            "MAE_no_weather": round(ml_no["MAE"], 1),
            "best_with_weather": ml_w_name,
            "MAE_with_weather": round(ml_w["MAE"], 1),
            "MAE_change_%": round(change, 1),           # negative = weather helped
            "baseline_MAE": round(no_w["Baseline"]["MAE"], 1),
        })

    summary = pd.DataFrame(rows)
    print("\n=== ARRIVALS: best ML model per crop, WITHOUT vs WITH weather (MAE in tonnes) ===")
    print(summary.to_string(index=False))

    helped = (summary["MAE_change_%"] < 0).sum()
    print(f"\nWeather lowered the error for {helped} of {len(summary)} crops.")
    print(f"Average MAE change: {summary['MAE_change_%'].mean():.1f}%  (negative = better)")

    summary.to_csv(ROOT / "ml_pipeline" / "arrival_weather_comparison_summary.csv", index=False)
    print("Saved ml_pipeline\\arrival_weather_comparison_summary.csv")


if __name__ == "__main__":
    main()