"""
weather.py
Fetches the next 7 days of weather for a crop's district from the free
Open-Meteo FORECAST API (no API key) and turns it into a simple rain-risk
summary for harvest advice.

Rule-based safety check, not an ML model: it does not change forecast accuracy,
it makes the harvest advice safer.
"""

import time

import requests

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

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

# ---- Simple in-memory cache: one API call per district per hour ----
# (the free Render server is slow, and many users would otherwise trigger
#  the same API call again and again)
CACHE_SECONDS = 3600
_cache = {}  # district -> (time fetched, result)


def _fetch_district_forecast(district):
    """Call Open-Meteo for one district; return the raw 'daily' dictionary."""
    lat, lon = DISTRICT_COORDS[district]
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,precipitation_probability_max,temperature_2m_max",
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",   # days follow the Indian calendar
    }
    response = requests.get(FORECAST_URL, params=params, timeout=15)
    response.raise_for_status()
    return response.json()["daily"]


def _summarise(district, daily):
    """Turn the raw 7-day numbers into a risk level and a plain-language message."""
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
            message = (f"About {total_rain} mm of rain is expected over the next 7 days. "
                       "Delay harvesting and protect harvested produce.")
        elif heavy == 0:
            message = (f"Heavy rain ({days[0]['rain_mm']} mm) is expected today. "
                       "Do not harvest or dry produce in the open.")
        else:
            message = (f"Heavy rain ({days[heavy]['rain_mm']} mm) is expected in {heavy} day(s). "
                       "Delay harvesting or finish and cover produce before then.")
    elif wet_days >= 1:
        risk = "moderate"
        message = (f"Some rain is expected ({wet_days} wet day(s), {total_rain} mm total). "
                   "Harvest on dry days and keep produce covered.")
    else:
        risk = "low"
        message = f"Mostly dry weather ahead ({total_rain} mm in 7 days). Good for harvesting."

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


def get_weather_outlook(commodity):
    """Main function: 7-day rain outlook for a crop. Never raises, so it can't crash the API."""
    district = CROP_DISTRICT.get(commodity.strip().lower())
    if district is None:
        return {"available": False, "message": f"No weather location configured for {commodity}."}

    # serve from cache if fetched less than an hour ago
    cached = _cache.get(district)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]

    try:
        result = _summarise(district, _fetch_district_forecast(district))
    except Exception as err:   # network error, API down, unexpected format ...
        return {"available": False, "district": district,
                "message": f"Weather forecast is temporarily unavailable ({type(err).__name__})."}

    _cache[district] = (time.time(), result)
    return result


# Quick manual test:  python backend\app\weather.py
if __name__ == "__main__":
    for crop in ["Groundnut", "Cumin", "Wheat"]:
        out = get_weather_outlook(crop)
        print(f"\n{crop}: {out.get('district')} -> risk={out.get('risk')}, "
              f"7-day rain={out.get('total_rain_mm')} mm")
        print("  ", out["message"])
        for d in out.get("daily", []):
            print(f"   {d['date']}  rain {d['rain_mm']:>5} mm  chance {d['rain_chance_pct']:>3}%  max {d['temp_max']} C")