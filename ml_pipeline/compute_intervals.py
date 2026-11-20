"""
compute_intervals.py
Works out a "likely range" for each crop's next-week price forecast.

HOW: we replay the forecasts on the TEST weeks (the most recent 20% of weeks, never used for
training) with the same method the app uses: the saved model if one exists, otherwise the baseline
"next week = this week". For every week we measure how far the forecast was from the real price,
as a percentage of the forecast. The 80th percentile of those misses is the range half-width:
"80% of past weekly forecasts were within +/- X% of the real price".

This is an honest range based on past errors. It is not a guarantee.

Run from the project root:   python ml_pipeline\compute_intervals.py
Output: backend\app\models\forecast_intervals.json
"""

import json
import os
import sys
from datetime import date

import joblib
import numpy as np
import pandas as pd

# Make the project root importable, then reuse the SAME feature code as training
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
from ml_pipeline.train_models import build_daily_series, add_features, train_test_split_by_time

DATA_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "mandi_prices_merged.parquet")
MODELS_DIR = os.path.join(PROJECT_ROOT, "backend", "app", "models")
OUT_FILE = os.path.join(MODELS_DIR, "forecast_intervals.json")

FEATURE_COLS = ["lag_1", "lag_2", "lag_4", "rolling_mean_4",
                "rolling_mean_8", "arrivals_lag_1", "month"]
LEVEL = 80   # the range should contain the real price in about 80% of weeks


def main():
    df = pd.read_parquet(DATA_PATH)
    results = {}

    print(f"{'Crop':<12}{'Method':<10}{'Test wks':>9}{'MAPE %':>9}{'+/- range %':>13}{'Last 13 wks inside':>20}")
    for crop in sorted(df["commodity"].unique()):
        featured = add_features(build_daily_series(df, crop))
        if len(featured) < 20:
            print(f"{crop:<12}skipped (not enough weekly data)")
            continue

        _, test = train_test_split_by_time(featured)
        actual = test["price"].values

        # Same method the live app uses for this crop
        model_path = os.path.join(MODELS_DIR, f"{crop.replace(' ', '_')}_price_model.pkl")
        if os.path.exists(model_path):
            method = "model"
            predicted = joblib.load(model_path).predict(test[FEATURE_COLS])
        else:
            method = "baseline"
            predicted = test["lag_1"].values

        # Miss as a percentage of the forecast (the range is applied to the forecast)
        miss_pct = np.abs(actual - predicted) / predicted * 100
        half_width = float(np.percentile(miss_pct, LEVEL))

        # Sanity check: how often were the most recent 13 weeks inside the range?
        recent = miss_pct[-13:]
        recent_inside = float(np.mean(recent <= half_width) * 100)

        results[crop] = {
            "half_width_pct": round(half_width, 2),
            "test_weeks": int(len(test)),
            "method": method,
            "mape_pct": round(float(miss_pct.mean()), 2),
        }
        print(f"{crop:<12}{method:<10}{len(test):>9}{miss_pct.mean():>9.2f}{half_width:>13.2f}{recent_inside:>19.0f}%")

    out = {"level_pct": LEVEL, "created": date.today().isoformat(), "crops": results}
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"\nSaved: {OUT_FILE}")


if __name__ == "__main__":
    main()