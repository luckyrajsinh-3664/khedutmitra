"""
weather.py
Gives the 7-day rain outlook for a crop's district and turns it into a simple
rain-risk summary for harvest advice.

DATA SOURCE: data/processed/forecast.json, refreshed every 6 hours by a GitHub
Action (ml_pipeline/update_forecast.py). We do NOT call Open-Meteo from the
Render server by default, because Open-Meteo rate-limits Render's shared IP
(HTTP 429). A live call is only a fallback if the file is missing or too old.

Rule-based safety check, not an ML model: it does not change forecast accuracy,
it makes the harvest advice safer.

The sentences are written in English or Gujarati ("lang"), see messages.py.
"""

import json
import os
import time
from datetime import datetime, timedelta, timezone

import requests

try:
    from backend.app.messages import msg, crop_label, normalise_lang
except ModuleNotFoundError:   # when this file is run directly: python backend\app\weather.py
    from messages import msg, crop_label, normalise_lang

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
FORECAST_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "forecast.json")
MAX_FILE_AGE_HOURS = 24      # older than this -> try a live call instead

# Same crop -> district mapping and district coordinates as the weather data fetch
CROP_DISTRICT = {
    "groundnut": "Rajkot",
    "cotton": "Surendranagar",
    "sesame": "Patan",
    "wheat": "Sabarkantha",
    "bajra": "Patan",
    "castor seed": "Banaskantha",
    "chickpea": "Botad",
    "cumin": "Mehsana",
    "mustard": "Surendranagar",
}

DISTRICT_COORDS = {
    "Rajkot":        (22.3039, 70.8022),
    "Surendranagar": (22.7196, 71.6369),
    "Patan":         (23.8493, 72.1266),
    "Sabarkantha":   (23.5980, 72.9660),
    "Banaskantha":   (24.1724, 72.4380),
    "Botad":         (22.1697, 71.6667),
    "Mehsana":       (23.5880, 72.3693),
}

# ---- Rain-risk thresholds (mm of rain per day) ----
HEAVY_DAY_MM = 15.0      # a day with this much rain can ruin standing/drying crop
WET_DAY_MM = 5.0         # noticeable rain: drying and field work are disturbed
HEAVY_TOTAL_MM = 30.0    # 7-day total that makes harvesting risky

# Identify ourselves politely to the free API
HEADERS = {"User-Agent": "KhedutMitra/1.0 (PDEU student project)"}

# Small in-memory cache for the live-call fallback only (one entry per district AND language)
CACHE_SECONDS = 3600
_cache = {}  # (district, lang) -> (time fetched, result)


def _fetch_live(district):
    """Fallback: call Open-Meteo directly for one district; return the raw 'daily' dictionary."""
    lat, lon = DISTRICT_COORDS[district]
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,precipitation_probability_max,temperature_2m_max",
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",
    }
    response = requests.get(FORECAST_URL, params=params, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return response.json()["daily"]


def _read_file(district):
    """
    Read this district's forecast from forecast.json.
    Returns (daily, updated_at) or None if the file is missing, unreadable or too old.
    """
    try:
        with open(FORECAST_FILE, encoding="utf-8") as f:
            data = json.load(f)
        daily = data["districts"][district]

        # how old is the file? (updated_at looks like "2026-10-14 21:30 IST")
        stamp = datetime.strptime(data["updated_at"], "%Y-%m-%d %H:%M IST")
        stamp = stamp.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        age = datetime.now(timezone.utc) - stamp
        if age > timedelta(hours=MAX_FILE_AGE_HOURS):
            return None
        return daily, data["updated_at"]
    except Exception:
        return None


def _summarise(district, daily, lang="en"):
    """Turn the raw 7-day numbers into a risk level and a plain-language message (English or Gujarati)."""
    days = []
    for i, date in enumerate(daily["time"]):
        days.append({
            "date": date,
            "rain_mm": round(daily["precipitation_sum"][i] or 0, 1),
            "rain_chance_pct": daily["precipitation_probability_max"][i] or 0,
            "temp_max": round(daily["temperature_2m_max"][i] or 0, 1),
        })

    total_rain = round(sum(d["rain_mm"] for d in days), 1)

    # first day (0 = today) with heavy rain, if any
    heavy = next((i for i, d in enumerate(days) if d["rain_mm"] >= HEAVY_DAY_MM), None)
    wet_days = sum(1 for d in days if d["rain_mm"] >= WET_DAY_MM)

    if heavy is not None or total_rain >= HEAVY_TOTAL_MM:
        risk = "high"
        if heavy is None:
            message = msg(lang, "weather_high_total", total=total_rain)
        elif heavy == 0:
            message = msg(lang, "weather_heavy_today", mm=days[0]["rain_mm"])
        else:
            message = msg(lang, "weather_heavy_later", mm=days[heavy]["rain_mm"], days=heavy)
    elif wet_days >= 1:
        risk = "moderate"
        message = msg(lang, "weather_moderate", wet=wet_days, total=total_rain)
    else:
        risk = "low"
        message = msg(lang, "weather_low", total=total_rain)

    return {
        "available": True,
        "district": district,
        "risk": risk,
        "total_rain_mm": total_rain,
        "wet_days": wet_days,
        "first_heavy_rain_in_days": heavy,
        "message": message,
        "daily": days,
    }


def get_weather_outlook(commodity, lang="en"):
    """Main function: 7-day rain outlook for a crop. Never raises, so it can't crash the API."""
    lang = normalise_lang(lang)

    district = CROP_DISTRICT.get(commodity.strip().lower())
    if district is None:
        return {"available": False,
                "message": msg(lang, "weather_no_location", crop=crop_label(lang, commodity))}

    # 1) Normal path: the file refreshed by the GitHub Action
    from_file = _read_file(district)
    if from_file:
        daily, updated_at = from_file
        try:
            result = _summarise(district, daily, lang)
            result["updated_at"] = updated_at
            return result
        except Exception as err:
            print(f"[weather] bad data in forecast.json for {district}: {err}")

    # 2) Fallback: live call (cached for an hour)
    cached = _cache.get((district, lang))
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]

    try:
        result = _summarise(district, _fetch_live(district), lang)
    except Exception as err:
        status = getattr(getattr(err, "response", None), "status_code", None)
        reason = f"HTTP {status}" if status else type(err).__name__
        print(f"[weather] live fetch failed for {district}: {reason} - {err}")
        return {"available": False, "district": district,
                "message": msg(lang, "weather_unavailable", reason=reason)}

    _cache[(district, lang)] = (time.time(), result)
    return result


# Quick manual test:  python backend\app\weather.py
if __name__ == "__main__":
    for crop in ["Groundnut", "Cumin", "Wheat"]:
        out = get_weather_outlook(crop)
        print(f"\n{crop}: {out.get('district')} -> risk={out.get('risk')}, "
              f"7-day rain={out.get('total_rain_mm')} mm, updated {out.get('updated_at')}")
        print("  ", out["message"])
        for d in out.get("daily", []):
            print(f"   {d['date']}  rain {d['rain_mm']:>5} mm  chance {d['rain_chance_pct']:>3}%  max {d['temp_max']} C")