"""
KhedutMitra - Harvest Window & Best Mandi Recommendation
This module is rule-based (not machine learning). It combines:
  1. Standard Gujarat crop calendars (when each crop is typically sown/harvested)
  2. Real mandi price data (to recommend which market pays best)
  3. Our trained price forecast models (to suggest whether to sell now or wait)
  4. The 7-day rain forecast (to warn against harvesting just before heavy rain)
  5. Our trained arrival (demand) forecast models
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

from backend.app.weather import get_weather_outlook  # 7-day rain outlook

DATA_PATH = "data/processed/mandi_prices_merged.parquet"
MODELS_DIR = "backend/app/models"

# The 7 features the saved price models were trained on (order matters)
FEATURE_COLS = ["lag_1", "lag_2", "lag_4", "rolling_mean_4",
                "rolling_mean_8", "arrivals_lag_1", "month"]

# The 6 features the saved arrival (demand) models were trained on (order matters)
ARRIVAL_FEATURE_COLS = ["arrivals_lag_1", "arrivals_lag_2", "arrivals_lag_4",
                        "arrivals_rolling_4", "price_lag_1", "month"]

# If a crop's latest price is older than this many days, we do NOT forecast.
# (Some crops, like Cotton, are only traded in season, so their latest data
# can be months old. A forecast built on that would be misleading.)
STALE_AFTER_DAYS = 42   # 6 weeks

# If the weekly average price changes by more than this much in one week, the forecast
# is flagged as unreliable (often one mandi reported unusual prices, or a mandi started/stopped reporting).
SHARP_MOVE_PCT = 30

# Weekly arrivals are noisy, so "stable" means within +/- this percentage of last week.
ARRIVAL_STABLE_BAND_PCT = 10

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


def get_india_now():
    """
    Current date and time in Indian time (UTC+5:30). The Render server runs on UTC,
    so we shift the clock ourselves instead of trusting the server's time zone.
    """
    india = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(india)


def get_current_month():
    """Current month number in Indian time."""
    return get_india_now().month


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
    Forecast NEXT week's price for a crop and say whether it is rising, falling or stable.

    How the features are built: every feature in training was "information known
    BEFORE the week being predicted" (lag_1 = the previous week's price, etc.).
    To predict the week AFTER the latest data week, we therefore build the features
    from the most recent weeks: lag_1 = the latest week's price, lag_2 = the week
    before that, and so on.

    Crops with no saved model (Groundnut, Castor Seed, Cumin) are the ones where
    the baseline "next week = this week" beat every ML model in our tests, so for
    them the forecast IS the baseline.

    If the latest price is more than STALE_AFTER_DAYS old (e.g. an off-season crop),
    no forecast is made: direction is "unavailable" and stale is True.

    If the weekly average price moved by more than SHARP_MOVE_PCT in one week,
    sharp_move is True and the advice says the forecast is unreliable.
    """
    crop_df = df[df["commodity"] == commodity]
    if crop_df.empty:
        return None

    # Weekly average price and total arrivals (weeks end on Sunday)
    weekly = crop_df.set_index("date").resample("W").agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    )
    weekly["price"] = weekly["price"].ffill(limit=2)   # fill short reporting gaps only
    prices = weekly["price"].dropna()

    if len(prices) < 8:      # need 8 weeks for rolling_mean_8
        return None

    last_week = prices.index[-1]          # label of the last week (a Sunday, can be in the future)
    current_price = float(prices.iloc[-1])

    # The REAL last day with a reported price. The week label above is a Sunday and can be
    # later than any real data, so we use the actual last date for what we show and for staleness.
    last_date = min(last_week, crop_df["date"].max())

    # How old is the latest price, compared with today (Indian time)?
    days_old = max((get_india_now().date() - last_date.date()).days, 0)
    weeks_old = days_old // 7

    # How much did the weekly average move compared with the week before?
    previous_price = float(prices.iloc[-2])
    weekly_move = (current_price - previous_price) / previous_price * 100
    sharp_move = abs(weekly_move) > SHARP_MOVE_PCT

    # ---- Stale data: refuse to forecast ----
    if days_old > STALE_AFTER_DAYS:
        return {
            "current_price": round(current_price, 2),
            "predicted_price": None,
            "change_percent": None,
            "direction": "unavailable",
            "method": "none",
            "stale": True,
            "sharp_move": False,
            "weekly_move_percent": round(weekly_move, 1),
            "weeks_old": weeks_old,
            "last_updated": last_date.strftime("%Y-%m-%d"),
        }

    model_path = os.path.join(MODELS_DIR, f"{commodity.replace(' ', '_')}_price_model.pkl")

    if os.path.exists(model_path):
        model = joblib.load(model_path)
        method = "model"

        # Features for the week AFTER last_week
        features = {
            "lag_1": prices.iloc[-1],
            "lag_2": prices.iloc[-2],
            "lag_4": prices.iloc[-4],
            "rolling_mean_4": prices.iloc[-4:].mean(),
            "rolling_mean_8": prices.iloc[-8:].mean(),
            "arrivals_lag_1": weekly["arrivals"].loc[last_week],
            "month": (last_week + pd.Timedelta(days=7)).month,
        }
        # DataFrame with column names, matching how the model was trained
        X = pd.DataFrame([features], columns=FEATURE_COLS)
        predicted_price = float(model.predict(X)[0])
    else:
        method = "baseline"
        predicted_price = current_price     # baseline: next week = this week

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
        "direction": direction,
        "method": method,                                   # "model" or "baseline"
        "stale": False,
        "sharp_move": bool(sharp_move),
        "weekly_move_percent": round(weekly_move, 1),
        "weeks_old": weeks_old,
        "last_updated": last_date.strftime("%Y-%m-%d"),     # last day with a reported price
    }


def _arrival_features(weekly):
    """
    Build the 6 arrival-model features for the week AFTER the last week in `weekly`.
    `weekly` has one row per COMPLETE week (index = Sunday label), columns: price, arrivals.
    This mirrors add_features() in train_arrival_models.py, shifted forward by one week:
      arrivals_lag_1 = last week, lag_2 = the week before, lag_4 = three weeks before that,
      arrivals_rolling_4 = average of the last 4 weeks, price_lag_1 = last week's price.
    Returns (feature dict, label of the last week).
    """
    arr = weekly["arrivals"]
    last_week = arr.index[-1]
    # a week with no trades has no price: use the most recent known price instead
    price_lag = weekly["price"].ffill().iloc[-1]
    features = {
        "arrivals_lag_1": arr.iloc[-1],
        "arrivals_lag_2": arr.iloc[-2],
        "arrivals_lag_4": arr.iloc[-4],
        "arrivals_rolling_4": arr.iloc[-4:].mean(),
        "price_lag_1": price_lag,
        "month": (last_week + pd.Timedelta(days=7)).month,
    }
    return features, last_week


def get_arrival_forecast(df, commodity):
    """
    Forecast how much of a crop will arrive in the mandis NEXT week (a demand indicator).

    Uses the saved arrival model where one beat the baseline in our tests; for the other
    crops (Chickpea, Cotton, Wheat) the forecast is the baseline "same as last week".
    Only COMPLETE weeks are used, because the newest week in the data often holds just
    a day or two of arrivals, which would look like a crash.
    Arrivals add up only the mandis that reported, so this is an indicator, not an exact figure.
    """
    crop_df = df[df["commodity"] == commodity]
    if crop_df.empty:
        return None

    weekly = crop_df.set_index("date").resample("W").agg(
        price=("modal_price", "mean"),          # NOT forward-filled: same as training
        arrivals=("arrival_quantity", "sum"),
    )

    # A week counts as complete once the data reaches (roughly) its end: use the newest date
    # in the whole dataset as the reference, and allow 2 days (Sat/Sun rarely trade).
    reference_date = df["date"].max()
    weekly = weekly[weekly.index <= reference_date + pd.Timedelta(days=2)]
    if len(weekly) < 8:
        return None

    features, last_week = _arrival_features(weekly)
    if pd.isna(features["price_lag_1"]):
        return None

    last_date = min(last_week, crop_df["date"].max())
    days_old = max((get_india_now().date() - last_date.date()).days, 0)
    weeks_old = days_old // 7
    current = float(features["arrivals_lag_1"])
    forecast_week_end = last_week + pd.Timedelta(days=7)

    base = {
        "unit": "tonnes",
        "week_ending": last_week.strftime("%Y-%m-%d"),                # the complete week we start from
        "forecast_week_ending": forecast_week_end.strftime("%Y-%m-%d"),
        "weeks_old": weeks_old,
        "last_updated": last_date.strftime("%Y-%m-%d"),
    }

    if days_old > STALE_AFTER_DAYS:
        return {**base, "current_arrivals": round(current, 1), "predicted_arrivals": None,
                "change_percent": None, "direction": "unavailable", "method": "none", "stale": True}

    model_path = os.path.join(MODELS_DIR, f"{commodity.replace(' ', '_')}_arrival_model.pkl")
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        X = pd.DataFrame([features], columns=ARRIVAL_FEATURE_COLS)
        predicted = max(float(model.predict(X)[0]), 0.0)      # arrivals cannot be negative
        method = "model"
    else:
        predicted = current                                    # baseline: same as last week
        method = "baseline"

    if current >= 1:
        change_percent = (predicted - current) / current * 100
        if change_percent > ARRIVAL_STABLE_BAND_PCT:
            direction = "rising"
        elif change_percent < -ARRIVAL_STABLE_BAND_PCT:
            direction = "falling"
        else:
            direction = "stable"
        change_percent = round(change_percent, 1)
    else:
        # almost nothing arrived last week, so a percentage is meaningless: compare in tonnes
        change_percent = None
        diff = predicted - current
        direction = "rising" if diff > 1 else "falling" if diff < -1 else "stable"

    return {**base, "current_arrivals": round(current, 1), "predicted_arrivals": round(predicted, 1),
            "change_percent": change_percent, "direction": direction, "method": method, "stale": False}


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
    # one-week model prediction can be noisy for volatile crops.
    if price_info is None:
        advice = "Price forecast not available for this crop; recommendation based on seasonal calendar only."
    elif price_info["stale"]:
        # Latest price is too old to forecast from (off-season or not reported)
        advice = (f"No recent prices are available for this crop (last reported {price_info['last_updated']}, "
                  f"about {price_info['weeks_old']} weeks ago, probably off-season or not reported), "
                  "so we cannot give a reliable price forecast.")
    elif price_info["sharp_move"]:
        # The weekly average jumped: usually only a few mandis reported, or one quoted unusual prices
        advice = (f"Prices moved sharply last week ({price_info['weekly_move_percent']:+.0f}%). This is unusual and "
                  "often happens when only a few mandis report, so we cannot give a reliable forecast. "
                  "Please check today's price at your local mandi before deciding.")
    elif price_info["method"] == "baseline":
        advice = (f"For this crop, last week's price (about Rs. {price_info['current_price']} per quintal) "
                  "has been the most accurate predictor in our tests, so we expect prices to stay "
                  "close to the current level.")
    else:
        change = price_info["change_percent"]
        if abs(change) > 15:
            advice = f"Our model predicts a large price swing ({change}% next week), but such large single-week changes are less reliable. Treat this as a signal to watch prices closely rather than a firm prediction."
        elif change > 1:
            advice = f"Prices are trending upward (+{change}% expected next week). If you have storage, consider holding stock for a slightly better price."
        elif change < -1:
            advice = f"Prices are trending downward ({change}% expected next week). Consider selling soon rather than waiting."
        else:
            advice = "Prices are expected to remain stable in the short term."

    # ---- Rain-aware harvest advice (rule-based safety check) ----
    # Is today inside this crop's typical harvest months?
    in_harvest_season = get_current_month() in calendar["harvest_months"]

    # get_weather_outlook never raises; if the weather source is down it returns available=False
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
    all_data = pd.read_parquet(DATA_PATH)
    for crop in CROP_CALENDAR.keys():
        print(f"\n{'='*60}")
        print(f"HARVEST RECOMMENDATION: {crop}")
        print(f"{'='*60}")
        result = get_harvest_recommendation(crop)
        for key, value in result.items():
            if key not in ("best_mandi", "weather_outlook"):  # skip long lists for readability
                print(f"  {key}: {value}")
        print(f"  arrival_forecast: {get_arrival_forecast(all_data, crop)}")