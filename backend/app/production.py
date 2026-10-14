"""
production.py
Historical crop production statistics for Gujarat (1997-2012), from the
cleaned file made by ml_pipeline/clean_production.py. Source: Ministry of
Agriculture & Farmers Welfare district-wise Area, Production and Yield
statistics (copy obtained via Kaggle).

This is HISTORICAL CONTEXT (long-term trends, main producing districts),
not current-season production. It is not used as a model input because its
years (1997-2012) do not overlap with our price data (2021-2026).
"""

import os

import pandas as pd

PRODUCTION_FILE = os.path.join(os.path.dirname(__file__), "..", "..",
                               "data", "processed", "crop_production_gujarat.parquet")

# Loaded once when the server starts. If the file is missing the API still works.
try:
    _df = pd.read_parquet(PRODUCTION_FILE)
except Exception as err:
    print(f"[production] could not load production data: {err}")
    _df = None

# Old official spellings in the source file -> spellings used elsewhere in KhedutMitra
DISTRICT_NAMES = {
    "BANAS KANTHA": "Banaskantha",
    "SABAR KANTHA": "Sabarkantha",
    "MAHESANA": "Mehsana",
    "KACHCHH": "Kachchh",
    "DOHAD": "Dahod",
    "PANCH MAHALS": "Panchmahals",
    "AHMADABAD": "Ahmedabad",
}


def pretty_district(name):
    """'BANAS KANTHA' -> 'Banaskantha'; other names just get normal capitals."""
    return DISTRICT_NAMES.get(str(name).strip().upper(), str(name).strip().title())


def get_production_summary(crop):
    """
    Production summary for one crop: state-wide yearly trend + top producing districts.
    Never raises, so it cannot crash the API.
    """
    if _df is None:
        return {"available": False, "message": "Production statistics are temporarily unavailable."}

    data = _df[_df["crop"] == crop]
    if data.empty:
        return {"available": False,
                "message": f"Production statistics for {crop} are not available in our dataset."}

    unit = data["unit"].iloc[0]
    last_year = int(data["year"].max())
    first_year = int(data["year"].min())

    # ---- state-wide totals per year ----
    yearly = data.groupby("year").agg(production=("production", "sum"),
                                      area_ha=("area_ha", "sum")).reset_index()
    yearly["yield_per_ha"] = yearly["production"] / yearly["area_ha"]
    trend = [{"year": int(r.year),
              "production": round(float(r.production), 0),
              "area_ha": round(float(r.area_ha), 0),
              "yield_per_ha": round(float(r.yield_per_ha), 2)} for r in yearly.itertuples()]

    # ---- top districts: average of the last 5 years (smooths one-off years) ----
    recent = data[data["year"] > last_year - 5]
    by_district = (recent.groupby("district")
                         .agg(production=("production", "sum"), area_ha=("area_ha", "sum"))
                         .reset_index())
    years_used = recent["year"].nunique()
    by_district["avg_production"] = by_district["production"] / years_used
    by_district["avg_area_ha"] = by_district["area_ha"] / years_used
    state_avg = by_district["avg_production"].sum()
    by_district["share_pct"] = by_district["avg_production"] / state_avg * 100
    top = by_district.nlargest(5, "avg_production")
    top_districts = [{"district": pretty_district(r.district),
                      "avg_production": round(float(r.avg_production), 0),
                      "avg_area_ha": round(float(r.avg_area_ha), 0),
                      "share_pct": round(float(r.share_pct), 1)} for r in top.itertuples()]

    # ---- headline change: first 3 years vs last 3 years (averages, so less noisy) ----
    early = yearly[yearly["year"] < first_year + 3]["production"].mean()
    late = yearly[yearly["year"] > last_year - 3]["production"].mean()
    change_pct = round(float((late - early) / early * 100), 1) if early > 0 else None

    first_rows = top_districts[0]
    message = (f"Between {first_year}-{first_year + 2} and {last_year - 2}-{last_year}, Gujarat's {crop} "
               f"production {'rose' if change_pct and change_pct > 0 else 'fell'} by about "
               f"{abs(change_pct)}% on average. {first_rows['district']} is the largest producing "
               f"district ({first_rows['share_pct']}% of the state total).")

    return {
        "available": True,
        "crop": crop,
        "unit": unit,
        "first_year": first_year,
        "last_year": last_year,
        "top_districts_basis": f"average of {last_year - years_used + 1}-{last_year}",
        "change_percent": change_pct,
        "message": message,
        "top_districts": top_districts,
        "yearly_trend": trend,
        "note": "Historical statistics (1997-2012), shown for context. Not current-season production.",
        "source": "Ministry of Agriculture & Farmers Welfare (district-wise Area, Production & Yield)",
    }


# Quick manual test:  python backend\app\production.py
if __name__ == "__main__":
    for c in ["Groundnut", "Cotton", "Cumin"]:
        out = get_production_summary(c)
        print(f"\n{c}: available={out['available']}")
        print("  ", out["message"])
        for d in out.get("top_districts", []):
            print(f"   {d['district']:<15} avg {d['avg_production']:>10,.0f} {out['unit']}  ({d['share_pct']}%)")