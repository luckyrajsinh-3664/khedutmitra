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


def build_daily_series(df, commodity):
    """
    Turn raw mandi-level rows into a WEEKLY price series for a crop.
    We average across all mandis and all days within each week.
    """
    crop_df = df[df["commodity"] == commodity].copy()
    crop_df = crop_df.set_index("date")

    weekly = crop_df.resample("W").agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    ).reset_index()

    # Drop weeks with no data at all (no mandi reported that week)
    weekly = weekly.dropna(subset=["price"]).reset_index(drop=True)

    return weekly


def add_features(weekly):
    """
    Create features that help the model predict next week's price:
    - lag features: what was the price N weeks ago?
    - rolling averages: what was the average price over the last N weeks?
    - calendar features: month (captures seasonality)
    """
    df = weekly.copy()

    # Lag features (past weekly prices)
    df["lag_1"] = df["price"].shift(1)
    df["lag_2"] = df["price"].shift(2)
    df["lag_4"] = df["price"].shift(4)

    # Rolling averages (smoothed recent trend)
    df["rolling_mean_4"] = df["price"].shift(1).rolling(window=4).mean()
    df["rolling_mean_8"] = df["price"].shift(1).rolling(window=8).mean()

    # Arrival features
    df["arrivals_lag_1"] = df["arrivals"].shift(1)

    # Calendar feature (captures seasonality)
    df["month"] = df["date"].dt.month

    # Drop early rows that don't have enough history for lag/rolling features
    df = df.dropna().reset_index(drop=True)

    return df


def train_test_split_by_time(df, test_size=0.2):
    """
    Split data by TIME, not randomly. We train on older data and test on
    the most recent data, since that's how forecasting actually works
    (you never get to see the future when training).
    """
    split_idx = int(len(df) * (1 - test_size))
    train = df.iloc[:split_idx]
    test = df.iloc[split_idx:]
    return train, test


def evaluate(y_true, y_pred):
    """Calculate 3 standard error metrics."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    return {"MAE": round(mae, 2), "RMSE": round(rmse, 2), "MAPE": round(mape, 2)}


def train_and_compare_models(train, test, feature_cols):
    """
    Train 4 models and compare their accuracy on the test set.
    Returns the results table and the trained models.
    """
    X_train, y_train = train[feature_cols], train["price"]
    X_test, y_test = test[feature_cols], test["price"]

    results = {}
    trained_models = {}

    # Model 1: Baseline - just predict "same as last week"
    baseline_pred = test["lag_1"].values
    results["Baseline (Last Week's Price)"] = evaluate(y_test.values, baseline_pred)

    # Model 2: Linear Regression
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    results["Linear Regression"] = evaluate(y_test.values, lr_pred)
    trained_models["Linear Regression"] = lr

    # Model 3: Random Forest
    rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    results["Random Forest"] = evaluate(y_test.values, rf_pred)
    trained_models["Random Forest"] = rf

    # Model 4: Gradient Boosting
    hgb = HistGradientBoostingRegressor(max_depth=6, random_state=42)
    hgb.fit(X_train, y_train)
    hgb_pred = hgb.predict(X_test)
    results["Gradient Boosting"] = evaluate(y_test.values, hgb_pred)
    trained_models["Gradient Boosting"] = hgb

    predictions = {
        "Baseline (Last Week's Price)": baseline_pred,
        "Linear Regression": lr_pred,
        "Random Forest": rf_pred,
        "Gradient Boosting": hgb_pred,
    }

    return results, trained_models, predictions


def plot_actual_vs_predicted(test, predictions, commodity):
    """Chart comparing actual prices to what each model predicted."""
    plt.figure(figsize=(12, 6))
    plt.plot(test["date"], test["price"], label="Actual Price", color="black", linewidth=2)

    for model_name, pred in predictions.items():
        plt.plot(test["date"], pred, label=model_name, alpha=0.7)

    plt.title(f"Actual vs Predicted Weekly Price - {commodity}")
    plt.xlabel("Week")
    plt.ylabel("Price (Rs./Quintal)")
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(f"{CHARTS_DIR}/{commodity}_actual_vs_predicted.png", dpi=150)
    plt.close()


def plot_feature_importance(model, feature_cols, commodity):
    """Chart showing which features mattered most to the Random Forest model."""
    importance = model.feature_importances_
    sorted_idx = np.argsort(importance)

    plt.figure(figsize=(8, 5))
    plt.barh([feature_cols[i] for i in sorted_idx], importance[sorted_idx], color="teal")
    plt.title(f"Feature Importance (Random Forest) - {commodity}")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(f"{CHARTS_DIR}/{commodity}_feature_importance.png", dpi=150)
    plt.close()


def run_for_crop(df, commodity, feature_cols):
    """Full pipeline for one crop: build series, add features, train, evaluate, save."""
    print(f"\n{'='*60}")
    print(f"Processing: {commodity}")
    print(f"{'='*60}")

    weekly = build_daily_series(df, commodity)
    featured = add_features(weekly)

    if len(featured) < 20:
        print(f"  Skipping {commodity} - not enough weekly data after feature engineering.")
        return None

    train, test = train_test_split_by_time(featured)
    print(f"  Train rows: {len(train)} | Test rows: {len(test)}")

    results, trained_models, predictions = train_and_compare_models(train, test, feature_cols)

    # Print comparison table
    results_df = pd.DataFrame(results).T
    print(f"\n  Model Comparison for {commodity}:")
    print(results_df.to_string())

    # Find best model by lowest MAE
    best_model_name = results_df["MAE"].idxmin()
    print(f"\n  Best model: {best_model_name}")

    # Save charts
    plot_actual_vs_predicted(test, predictions, commodity)
    if "Random Forest" in trained_models:
        plot_feature_importance(trained_models["Random Forest"], feature_cols, commodity)

    # Save the best model to disk (skip if baseline won, since baseline isn't a real model)
    if best_model_name in trained_models:
        model_path = f"{MODELS_DIR}/{commodity.replace(' ', '_')}_price_model.pkl"
        joblib.dump(trained_models[best_model_name], model_path)
        print(f"  Saved best model to: {model_path}")

    return {"commodity": commodity, "best_model": best_model_name, **results[best_model_name]}


def main():
    df = pd.read_parquet(DATA_PATH)
    commodities = df["commodity"].unique()

    feature_cols = ["lag_1", "lag_2", "lag_4", "rolling_mean_4",
                     "rolling_mean_8", "arrivals_lag_1", "month"]

    summary = []
    for commodity in commodities:
        result = run_for_crop(df, commodity, feature_cols)
        if result:
            summary.append(result)

    # Print final summary across all crops
    print(f"\n\n{'='*60}")
    print("FINAL SUMMARY - BEST MODEL PER CROP")
    print(f"{'='*60}")
    summary_df = pd.DataFrame(summary)
    print(summary_df.to_string(index=False))

    summary_df.to_csv("ml_pipeline/model_comparison_summary.csv", index=False)
    print("\nSaved summary to: ml_pipeline/model_comparison_summary.csv")


if __name__ == "__main__":
    main()