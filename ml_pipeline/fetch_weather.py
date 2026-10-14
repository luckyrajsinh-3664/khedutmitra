"""
fetch_weather.py
Downloads DAILY historical weather (temperature + rainfall) for the 7 districts
used in KhedutMitra, from the free Open-Meteo Archive API (no API key needed).

Output: data/processed/weather_daily.csv and weather_daily.parquet
Run from the project root:  python ml_pipeline\\fetch_weather.py
"""

import time
from pathlib import Path

import pandas as pd
import requests

# ---------- Settings ----------
API_URL = "https://archive-api.open-meteo.com/v1/archive"

# Same date range as our mandi price data
START_DATE = "2021-01-01"
END_DATE = "2026-09-24"

# One approximate location per district (district HQ coordinates).
# We use districts, not individual mandis, because our models forecast one
# weekly price per crop, and many mandis have very few records.
DISTRICTS = {
    "Rajkot":        (22.3039, 70.8022),
    "Surendranagar": (22.7196, 71.6369),
    "Patan":         (23.8493, 72.1266),
    "Sabarkantha":   (23.5980, 72.9660),
    "Banaskantha":   (24.1724, 72.4380),
    "Botad":         (22.1697, 71.6667),
    "Mehsana":       (23.5880, 72.3693),
}

# Project root = parent of the ml_pipeline folder (works from any terminal location)
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "processed"


def fetch_district(name, lat, lon):
    """Download daily weather for ONE district and return it as a DataFrame."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum",
        "timezone": "Asia/Kolkata",  # so each "day" matches an Indian calendar day
    }

    # Try up to 3 times in case of a temporary network error / rate limit
    for attempt in range(1, 4):
        try:
            response = requests.get(API_URL, params=params, timeout=60)
            response.raise_for_status()  # raises an error for 4xx / 5xx responses
            break
        except requests.RequestException as err:
            print(f"  attempt {attempt} failed for {name}: {err}")
            if attempt == 3:
                raise
            time.sleep(5 * attempt)  # wait a bit longer each retry

    daily = response.json()["daily"]

    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        "district": name,
        "temp_max": daily["temperature_2m_max"],
        "temp_min": daily["temperature_2m_min"],
        "temp_mean": daily["temperature_2m_mean"],
        "rainfall_mm": daily["precipitation_sum"],
    })
    return df


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    frames = []
    for name, (lat, lon) in DISTRICTS.items():
        print(f"Fetching {name} ...")
        frames.append(fetch_district(name, lat, lon))
        time.sleep(1)  # be polite to the free API

    weather = pd.concat(frames, ignore_index=True)

    # Save in both formats, like our price dataset
    weather.to_csv(OUT_DIR / "weather_daily.csv", index=False)
    weather.to_parquet(OUT_DIR / "weather_daily.parquet", index=False)

    # ---------- Quick sanity checks ----------
    print("\nSaved", len(weather), "rows")
    print("\nRows per district (all should be equal):")
    print(weather.groupby("district").size())
    print("\nMissing values per column:")
    print(weather.isna().sum())
    print("\nDate range:", weather["date"].min().date(), "to", weather["date"].max().date())
    print("\nSummary (mm / deg C):")
    print(weather[["temp_max", "temp_min", "rainfall_mm"]].describe().round(1))


if __name__ == "__main__":
    main()