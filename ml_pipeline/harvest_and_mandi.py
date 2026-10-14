"""
KhedutMitra - Harvest Window & Best Mandi Recommendation
This module is rule-based (not machine learning). It combines:
  1. Standard Gujarat crop calendars (when each crop is typically sown/harvested)
  2. Real mandi price data (to recommend which market pays best)
  3. Our trained price forecast models (to suggest whether to sell now or wait)
  4. The 7-day rain forecast (to warn against harvesting just before heavy rain)
"""

import os
import sys
from datetime import datetime, timedelta, timezone

import pandas as pd
import joblib

# Make the project root importable, so this file also works when run directly
# (python ml_pipeline\harvest_and_mandi.py). On Render the root is already on the path.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.weather import get_weather_outlook  # NEW: 7-day rain outlook

DATA_PATH = "data/processed/mandi_prices_merged.parquet"
MODELS_DIR = "backend/app/models"

# CROP CALENDAR: standard sowing and harvesting months for Gujarat.
# Based on general agricultural extension knowledge (kharif crops are
# sown with the monsoon in June-July and harvested Sept-Dec; rabi crops
# are sown after monsoon in Oct-Nov and harvested Feb-March).
CROP_CALENDAR = {
    "Groundnut":   {"season": "Kharif", "sowing_months": [6, 7],  "harvest_months": [10, 11]},
    "Cotton":      {"season": "Kharif", "sowing_months": [6, 7],  "harvest_months": [10, 11, 12]},
    "Bajra":       {"season": "Kharif", "sowing_months": [6, 7],  "harvest_months": [9, 10]},
    "Sesame":      {"season": "Kharif", "sowing_months": [6, 7],  "harvest_months": [9, 10]},
    "Castor Seed": {"season": "Kharif (long duration)", "sowing_months": [6, 7], "harvest_months": [11, 12, 1, 2]},
    "Wheat":       {"season": "Rabi",   "sowing_months": [11],    "harvest_months": [2, 3]},
    "Chickpea":    {"season": "Rabi",   "sowing_months": [10, 11],"harvest_months": [2, 3]},
    "Cumin":       {"season": "Rabi",   "sowing_months": [11],    "harvest_months": [2, 3]},
    "Mustard":     {"season": "Rabi",   "sowing_months": [10, 11],"harvest_months": [2, 3]},
}


def get_crop_calendar(commodity):
    """Look up the sowing/harvest calendar for a crop."""
    if commodity not in CROP_CALENDAR:
        return None
    return CROP_CALENDAR[commodity]


def get_current_month():
    """
    Current month in Indian time (UTC+5:30). The Render server runs on UTC,
    so we shift the clock ourselves instead of trusting the server's time zone.
    """
    india = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(india).month


def get_best_mandi(df, commodity, recent_days=90):
    """
    Recommend the best mandi (market) for a crop, based on which one has
    paid the highest average price over the most recent period.
    """
    crop_df = df[df["commodity"] == commodity].copy()
    if crop_df.empty:
        return None

    cutoff_date = crop_df["date"].max() - pd.Timedelta(days=recent_days)
    recent_df = crop_df[crop_df["date"] >= cutoff_date]

    # Average price per market, only for markets with enough recent data to be reliable
    market_stats = recent_df.groupby("market").agg(
        avg_price=("modal_price", "mean"),
        num_records=("modal_price", "count")
    ).reset_index()

    market_stats = market_stats[market_stats["num_records"] >= 3]  # ignore markets with too little data
    market_stats = market_stats.sort_values("avg_price", ascending=False)

    if market_stats.empty:
        return None

    best = market_stats.iloc[0]
    worst = market_stats.iloc[-1]

    return {
        "best_market": best["market"],
        "best_avg_price": round(best["avg_price"], 2),
        "worst_market": worst["market"],
        "worst_avg_price": round(worst["avg_price"], 2),
        "price_difference": round(best["avg_price"] - worst["avg_price"], 2),
        "all_markets": market_stats.to_dict(orient="records")
    }


def get_price_direction(df, commodity):
    """
    Use our saved price forecasting model to check if next week's price
    is expected to go UP or DOWN compared to this week. This tells us
    whether "wait" or "sell now" is the better suggestion.
    """
    model_path = os.path.join(MODELS_DIR, f"{commodity.replace(' ', '_')}_price_model.pkl")

    if not os.path.exists(model_path):
        return None  # No trained model for this crop; we'll skip the price-based suggestion

    model = joblib.load(model_path)

    crop_df = df[df["commodity"] == commodity].copy()
    crop_df = crop_df.set_index("date")
    weekly = crop_df.resample("W").agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    ).reset_index()

    weekly["lag_1"] = weekly["price"].shift(1)
    weekly["lag_2"] = weekly["price"].shift(2)
    weekly["lag_4"] = weekly["price"].shift(4)
    weekly["rolling_mean_4"] = weekly["price"].shift(1).rolling(window=4).mean()
    weekly["rolling_mean_8"] = weekly["price"].shift(1).rolling(window=8).mean()
    weekly["arrivals_lag_1"] = weekly["arrivals"].shift(1)
    weekly["month"] = weekly["date"].dt.month

    latest = weekly.dropna().iloc[-1]
    feature_cols = ["lag_1", "lag_2", "lag_4", "rolling_mean_4",
                     "rolling_mean_8", "arrivals_lag_1", "month"]

    # Keep as a DataFrame with column names, matching how the model was
    # trained (avoids a harmless but noisy sklearn warning)
    X = latest[feature_cols].to_frame().T

    predicted_price = model.predict(X)[0]
    current_price = latest["price"]

    change_percent = ((predicted_price - current_price) / current_price) * 100

    if change_percent > 1:
        direction = "rising"
    elif change_percent < -1:
        direction = "falling"
    else:
        direction = "stable"

    return {
        "current_price": round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "change_percent": round(change_percent, 2),
        "direction": direction
    }


def get_harvest_recommendation(commodity):
    """
    Combine crop calendar + price forecast + 7-day rain outlook into one
    plain-language recommendation for the farmer.
    """
    df = pd.read_parquet(DATA_PATH)

    calendar = get_crop_calendar(commodity)
    if calendar is None:
        return {"error": f"No crop calendar available for {commodity}"}

    mandi_info = get_best_mandi(df, commodity)
    price_info = get_price_direction(df, commodity)

    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    sowing_str = ", ".join(month_names[m] for m in calendar["sowing_months"])
    harvest_str = ", ".join(month_names[m] for m in calendar["harvest_months"])

    # Build a simple, plain-language recommendation.
    # Large single-week predicted swings are treated cautiously, since a
    # one-week model prediction can be noisy for volatile crops like Sesame.
    if price_info:
        change = price_info["change_percent"]
        if abs(change) > 15:
            advice = f"Our model predicts a large price swing ({change}% next week), but such large single-week changes are less reliable. Treat this as a signal to watch prices closely rather than a firm prediction."
        elif change > 1:
            advice = f"Prices are trending upward (+{change}% expected next week). If you have storage, consider holding stock for a slightly better price."
        elif change < -1:
            advice = f"Prices are trending downward ({change}% expected next week). Consider selling soon rather than waiting."
        else:
            advice = "Prices are expected to remain stable in the short term."
    else:
        advice = "Price forecast not available for this crop; recommendation based on seasonal calendar only."

    # ---- NEW: rain-aware harvest advice (rule-based safety check) ----
    # Is today inside this crop's typical harvest months?
    in_harvest_season = get_current_month() in calendar["harvest_months"]

    # get_weather_outlook never raises; if the weather API is down it returns available=False
    weather = get_weather_outlook(commodity)

    if weather["available"]:
        if in_harvest_season and weather["risk"] in ("moderate", "high"):
            # Harvest time + rain coming: this matters most, so put it first
            advice = "WEATHER: " + weather["message"] + " " + advice
        elif in_harvest_season:
            advice = advice + " Weather: " + weather["message"]
        elif weather["risk"] == "high":
            # Not harvest time, but heavy rain can still damage stored/drying produce
            advice = advice + " Weather alert: " + weather["message"]

    return {
        "commodity": commodity,
        "season": calendar["season"],
        "typical_sowing_months": sowing_str,
        "typical_harvest_months": harvest_str,
        "in_harvest_season": in_harvest_season,
        "price_forecast": price_info,
        "best_mandi": mandi_info,
        "weather_outlook": weather,
        "advice": advice
    }


if __name__ == "__main__":
    # Quick test: run this file directly to see recommendations for all crops
    for crop in CROP_CALENDAR.keys():
        print(f"\n{'='*60}")
        print(f"HARVEST RECOMMENDATION: {crop}")
        print(f"{'='*60}")
        result = get_harvest_recommendation(crop)
        for key, value in result.items():
            if key not in ("best_mandi", "weather_outlook"):  # skip long lists for readability
                print(f"  {key}: {value}")