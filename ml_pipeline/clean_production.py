"""
clean_production.py
Cleans the all-India crop production file (Kaggle copy of the Ministry of
Agriculture district-wise Area, Production and Yield statistics, 1997-2012)
down to OUR 8 available crops in Gujarat, one row per district + year + crop.

Output: data/processed/crop_production_gujarat.parquet (+ .csv)
Run from the project root:  python ml_pipeline\\clean_production.py
"""

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "crop_production_india.csv"
OUT_DIR = ROOT / "data" / "processed"

# Name used in the production file -> name used in KhedutMitra
CROP_MAP = {
    "Groundnut": "Groundnut",
    "Cotton(lint)": "Cotton",
    "Sesamum": "Sesame",
    "Wheat": "Wheat",
    "Bajra": "Bajra",
    "Castor seed": "Castor Seed",
    "Gram": "Chickpea",
    "Rapeseed &Mustard": "Mustard",
}
# Cumin is not in this dataset, so it has no production statistics.

# Cotton is reported in bales in the government data, all others in tonnes
UNIT = {"Cotton": "bales"}


def main():
    df = pd.read_csv(RAW)

    # tidy text columns (the file has stray spaces)
    for col in ["State_Name", "District_Name", "Season", "Crop"]:
        df[col] = df[col].astype(str).str.strip()

    # keep Gujarat and our crops only
    df = df[df["State_Name"].str.lower() == "gujarat"]
    df = df[df["Crop"].isin(CROP_MAP)].copy()
    df["crop"] = df["Crop"].map(CROP_MAP)

    rows_before = len(df)

    # remove rows with missing or impossible values
    df = df.dropna(subset=["Area", "Production"])
    df = df[(df["Area"] > 0) & (df["Production"] >= 0)]
    print(f"Removed {rows_before - len(df)} rows with missing/zero area or missing production")

    # A crop can have several seasons in one district-year: add them up
    out = (df.groupby(["crop", "District_Name", "Crop_Year"], as_index=False)
             .agg(area_ha=("Area", "sum"), production=("Production", "sum")))
    out = out.rename(columns={"District_Name": "district", "Crop_Year": "year"})

    # yield = production per hectare
    out["yield_per_ha"] = (out["production"] / out["area_ha"]).round(3)
    out["unit"] = out["crop"].map(UNIT).fillna("tonnes")
    out[["area_ha", "production"]] = out[["area_ha", "production"]].round(2)
    out = out.sort_values(["crop", "year", "production"], ascending=[True, True, False])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out.to_parquet(OUT_DIR / "crop_production_gujarat.parquet", index=False)
    out.to_csv(OUT_DIR / "crop_production_gujarat.csv", index=False)

    # ---------- checks ----------
    print("\nSaved", len(out), "rows")
    print("Years:", out["year"].min(), "to", out["year"].max())
    print("\nRows, districts and last year per crop:")
    print(out.groupby("crop").agg(rows=("year", "size"),
                                  districts=("district", "nunique"),
                                  first_year=("year", "min"),
                                  last_year=("year", "max")))

    print("\nTop 3 districts in each crop's last year (production):")
    for crop, g in out.groupby("crop"):
        last = g[g["year"] == g["year"].max()].nlargest(3, "production")
        text = ", ".join(f"{r.district} ({r.production:,.0f})" for r in last.itertuples())
        print(f"  {crop} [{g['year'].max()}, {UNIT.get(crop, 'tonnes')}]: {text}")


if __name__ == "__main__":
    main()