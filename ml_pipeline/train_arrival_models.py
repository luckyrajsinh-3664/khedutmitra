import matplotlib
matplotlib.use("Agg")

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
import os

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

DATA_PATH = "data/processed/mandi_prices_merged.parquet"
MODELS_DIR = "backend/app/models"
CHARTS_DIR = "ml_pipeline/model_charts"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(CHARTS_DIR, exist_ok=True)


def build_weekly_series(df, commodity):
    """Build a weekly series of price AND arrivals for one crop."""
    crop_df = df[df["commodity"] == commodity].copy()
    crop_df = crop_df.set_index("date")

    weekly = crop_df.resample("W").agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    ).reset_index()

    weekly = weekly.dropna(subset=["arrivals"]).reset_index(drop=True)
    return weekly


def add_features(weekly):
    """
    Create features to predict next week's ARRIVAL QUANTITY.
    Past arrivals and past prices both matter here: farmers often bring
    more crop to market when recent prices were high.
    """
    df = weekly.copy()

    # Lag features on arrivals (the thing we're predicting)
    df["arrivals_lag_1"] = df["arrivals"].shift(1)
    df["arrivals_lag_2"] = df["arrivals"].shift(2)
    df["arrivals_lag_4"] = df["arrivals"].shift(4)

    # Rolling averages of arrivals
    df["arrivals_rolling_4"] = df["arrivals"].shift(1).rolling(window=4).mean()

    # Price features (price often influences how much farmers bring to sell)
    df["price_lag_1"] = df["price"].shift(1)

    # Calendar feature (harvest seasons drive arrivals strongly)
    df["month"] = df["date"].dt.month

    df = df.dropna().reset_index(drop=True)
    return df


def train_test_split_by_time(df, test_size=0.2):
    split_idx = int(len(df) * (1 - test_size))
    return df.iloc[:split_idx], df.iloc[split_idx:]


def evaluate(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    # Avoid divide-by-zero for MAPE when arrivals are very low some weeks
    mape = np.mean(np.abs((y_true - y_pred) / np.where(y_true == 0, 1, y_true))) * 100
    return {"MAE": round(mae, 2), "RMSE": round(rmse, 2), "MAPE": round(mape, 2)}


def train_and_compare_models(train, test, feature_cols):
    X_train, y_train = train[feature_cols], train["arrivals"]
    X_test, y_test = test[feature_cols], test["arrivals"]

    results = {}
    trained_models = {}

    baseline_pred = test["arrivals_lag_1"].values
    results["Baseline (Last Week's Arrivals)"] = evaluate(y_test.values, baseline_pred)

    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    results["Linear Regression"] = evaluate(y_test.values, lr_pred)
    trained_models["Linear Regression"] = lr

    rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    results["Random Forest"] = evaluate(y_test.values, rf_pred)
    trained_models["Random Forest"] = rf

    hgb = HistGradientBoostingRegressor(max_depth=6, random_state=42)
    hgb.fit(X_train, y_train)
    hgb_pred = hgb.predict(X_test)
    results["Gradient Boosting"] = evaluate(y_test.values, hgb_pred)
    trained_models["Gradient Boosting"] = hgb

    predictions = {
        "Baseline (Last Week's Arrivals)": baseline_pred,
        "Linear Regression": lr_pred,
        "Random Forest": rf_pred,
        "Gradient Boosting": hgb_pred,
    }

    return results, trained_models, predictions


def plot_actual_vs_predicted(test, predictions, commodity):
    plt.figure(figsize=(12, 6))
    plt.plot(test["date"], test["arrivals"], label="Actual Arrivals", color="black", linewidth=2)
    for model_name, pred in predictions.items():
        plt.plot(test["date"], pred, label=model_name, alpha=0.7)
    plt.title(f"Actual vs Predicted Weekly Arrivals - {commodity}")
    plt.xlabel("Week")
    plt.ylabel("Arrival Quantity (Metric Tonnes)")
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(f"{CHARTS_DIR}/{commodity}_arrivals_actual_vs_predicted.png", dpi=150)
    plt.close()


def run_for_crop(df, commodity, feature_cols):
    print(f"\n{'='*60}")
    print(f"Processing arrivals for: {commodity}")
    print(f"{'='*60}")

    weekly = build_weekly_series(df, commodity)
    featured = add_features(weekly)

    if len(featured) < 20:
        print(f"  Skipping {commodity} - not enough data.")
        return None

    train, test = train_test_split_by_time(featured)
    print(f"  Train rows: {len(train)} | Test rows: {len(test)}")

    results, trained_models, predictions = train_and_compare_models(train, test, feature_cols)

    results_df = pd.DataFrame(results).T
    print(f"\n  Arrival Model Comparison for {commodity}:")
    print(results_df.to_string())

    best_model_name = results_df["MAE"].idxmin()
    print(f"\n  Best model: {best_model_name}")

    plot_actual_vs_predicted(test, predictions, commodity)

    if best_model_name in trained_models:
        model_path = f"{MODELS_DIR}/{commodity.replace(' ', '_')}_arrival_model.pkl"
        joblib.dump(trained_models[best_model_name], model_path)
        print(f"  Saved best model to: {model_path}")

    return {"commodity": commodity, "best_model": best_model_name, **results[best_model_name]}


def main():
    df = pd.read_parquet(DATA_PATH)
    commodities = df["commodity"].unique()

    feature_cols = ["arrivals_lag_1", "arrivals_lag_2", "arrivals_lag_4",
                     "arrivals_rolling_4", "price_lag_1", "month"]

    summary = []
    for commodity in commodities:
        result = run_for_crop(df, commodity, feature_cols)
        if result:
            summary.append(result)

    print(f"\n\n{'='*60}")
    print("FINAL SUMMARY - BEST ARRIVAL MODEL PER CROP")
    print(f"{'='*60}")
    summary_df = pd.DataFrame(summary)
    print(summary_df.to_string(index=False))

    summary_df.to_csv("ml_pipeline/arrival_model_comparison_summary.csv", index=False)
    print("\nSaved summary to: ml_pipeline/arrival_model_comparison_summary.csv")

    # Explain why MAPE looks unusually high for arrival forecasting.
    # This is a real, well-known limitation of MAPE, not a mistake in our models.
    print("\n" + "="*60)
    print("IMPORTANT NOTE ON METRICS FOR ARRIVAL FORECASTING")
    print("="*60)
    print("""
MAPE (Mean Absolute Percentage Error) becomes unreliable when actual
values are close to zero, because dividing by a tiny number inflates
the percentage error even when the absolute error is small.

Arrival quantities often have low-volume weeks (a mandi may report
very little on some weeks), which is why MAPE values above look high
even for genuinely accurate models.

For this reason, MAE (Mean Absolute Error, in Metric Tonnes) is the
more reliable metric for arrival forecasting in this project, and is
what we used to select the best model per crop.
""")


if __name__ == "__main__":
    main()