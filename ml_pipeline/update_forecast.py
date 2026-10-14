"""
update_forecast.py
Downloads the 7-day forecast for all 7 districts from Open-Meteo and saves it to
data/processed/forecast.json. Run by a scheduled GitHub Action (see
.github/workflows/update-forecast.yml), because Open-Meteo rate-limits Render's
shared IP address (HTTP 429).

If a download fails, the OLD value for that district is kept, so the file never
loses data. Run by hand with:  python ml_pipeline\\update_forecast.py
"""

import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))   # so "backend.app.weather" can be imported

from backend.app.weather import DISTRICT_COORDS, FORECAST_URL, HEADERS   # same coordinates as the API

OUT_FILE = ROOT / "data" / "processed" / "forecast.json"


def fetch(district):
    """Download the raw 7-day 'daily' data for one district (3 tries, then give up)."""
    lat, lon = DISTRICT_COORDS[district]
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,precipitation_probability_max,temperature_2m_max",
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",
    }
    for attempt in range(1, 4):
        r = requests.get(FORECAST_URL, params=params, headers=HEADERS, timeout=30)
        if r.status_code == 429 or r.status_code >= 500:
            print(f"  {district}: HTTP {r.status_code}, retry {attempt}/3")
            time.sleep(15 * attempt)    # wait longer each time
            continue
        r.raise_for_status()
        return r.json()["daily"]
    return None


def main():
    # start from the old file, so a failed district keeps its previous data
    old = {}
    if OUT_FILE.exists():
        old = json.loads(OUT_FILE.read_text(encoding="utf-8")).get("districts", {})

    districts = dict(old)
    ok = 0
    for name in DISTRICT_COORDS:
        print(f"Fetching {name} ...")
        try:
            daily = fetch(name)
        except Exception as err:
            print(f"  {name}: failed ({err}), keeping old data")
            daily = None
        if daily:
            districts[name] = daily
            ok += 1
        time.sleep(2)   # be polite to the free API

    if ok == 0:
        print("No district could be updated. Leaving the file unchanged.")
        sys.exit(0)     # not an error: the site just keeps the older forecast

    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    out = {"updated_at": now.strftime("%Y-%m-%d %H:%M IST"), "districts": districts}
    OUT_FILE.write_text(json.dumps(out), encoding="utf-8")
    print(f"Saved {OUT_FILE.name}: {ok}/{len(DISTRICT_COORDS)} districts updated at {out['updated_at']}")


if __name__ == "__main__":
    main()