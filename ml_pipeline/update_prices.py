"""
update_prices.py
Semi-automatic refresh of the mandi price dataset.

You download new Agmarknet CSVs (same report as the original data) into
data/raw/new/. This script cleans them with the SAME rules as clean_merge_data.py,
merges them into data/processed/mandi_prices_merged.parquet (new rows win when the
same crop + market + date already exists), runs the data quality checks, and only
then saves. The old file is backed up first.

Safety: a market that is not already in the old data for that crop is LEFT OUT
(so a download for the wrong district cannot change the mandi rankings).
Use --allow-new-markets to include them on purpose.

Run from the project root:
  python ml_pipeline\\update_prices.py --dry-run     (checks everything, writes nothing)
  python ml_pipeline\\update_prices.py               (saves the merged dataset)
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

import pandas as pd

# Work from the project root so the relative paths in clean_merge_data.py are correct
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Reuse the exact cleaning functions of the original pipeline
from clean_merge_data import load_and_clean_file, clean_dataframe

NEW_DIR = ROOT / "data" / "raw" / "new"
MERGED_PARQUET = ROOT / "data" / "processed" / "mandi_prices_merged.parquet"
MERGED_CSV = ROOT / "data" / "processed" / "mandi_prices_merged.csv"
BACKUP = ROOT / "data" / "raw" / "mandi_prices_before_update.parquet"   # gitignored folder

# Same name fixes as clean_merge_data.py (keep the two in sync)
NAME_FIXES = {
    "Bajra(Pearl Millet/Cumbu)": "Bajra",
    "Bengal Gram(Gram)(Whole)": "Chickpea",
    "Cummin Seed(Jeera)": "Cumin",
    "Sesamum(Sesame,Gingelly,Til)": "Sesame",
}


def validate(df):
    """The same 5 data quality checks as validate_data.py. Returns True if all pass."""
    today = pd.Timestamp.today().normalize()
    checks = [
        ("No missing values in date, commodity, market, price",
         df[["date", "commodity", "market", "modal_price"]].isna().sum().sum() == 0),
        ("All modal prices are positive", (df["modal_price"] > 0).all()),
        ("Prices in realistic range (100 - 100000)", df["modal_price"].between(100, 100000).all()),
        ("No duplicate commodity + market + date records",
         not df.duplicated(subset=["commodity", "market", "date"]).any()),
        ("All dates between 2021-01-01 and today",
         df["date"].between(pd.Timestamp("2021-01-01"), today).all()),
    ]
    all_ok = True
    print("\nData quality checks:")
    for name, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
        all_ok = all_ok and bool(ok)
    return all_ok


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="check everything but do not save")
    parser.add_argument("--allow-new-markets", action="store_true",
                        help="also include markets that are not in the old data")
    args = parser.parse_args()

    files = sorted(NEW_DIR.glob("*.csv"))
    if not files:
        print(f"No CSV files found in {NEW_DIR}. Download the new Agmarknet files there first.")
        return

    old = pd.read_parquet(MERGED_PARQUET)
    known_crops = set(old["commodity"].unique())
    known_pairs = set(zip(old["commodity"], old["market"]))
    old_districts = old.groupby("commodity")["district"].agg(lambda s: sorted(set(s)))
    print(f"Existing dataset: {len(old)} rows, latest date {old['date'].max().date()}\n")

    # ---- clean every new file exactly like the original pipeline ----
    parts = []
    for f in files:
        print(f"Reading {f.name} ...")
        try:
            df = clean_dataframe(load_and_clean_file(str(f)))
        except Exception as err:
            print(f"  SKIPPED: {type(err).__name__}: {err}")
            continue
        df["commodity"] = df["commodity"].replace(NAME_FIXES)

        # unknown crop names
        unknown = set(df["commodity"].unique()) - known_crops
        if unknown:
            print(f"  WARNING: unknown commodity name(s) {sorted(unknown)} - these rows are left out "
                  f"(add a fix to NAME_FIXES if it is one of our 9 crops)")
            df = df[df["commodity"].isin(known_crops)]
        if df.empty:
            print("  no usable rows")
            continue

        # show the district(s) in this file next to the district(s) of the old data
        for crop in df["commodity"].unique():
            new_d = sorted(set(df.loc[df["commodity"] == crop, "district"]))
            flag = "" if set(new_d) <= set(old_districts[crop]) else "   <-- DIFFERENT FROM OLD DATA"
            print(f"  {crop}: district(s) in this file {new_d} | in old data {old_districts[crop]}{flag}")

        # markets that are not in the old data for that crop
        is_known = pd.Series([p in known_pairs for p in zip(df["commodity"], df["market"])], index=df.index)
        if not is_known.all():
            names = sorted(set(df.loc[~is_known, "market"]))
            if args.allow_new_markets:
                print(f"  NOTE: including new market(s) not in old data: {names}")
            else:
                print(f"  LEFT OUT {int((~is_known).sum())} rows from market(s) not in old data: {names} "
                      f"(use --allow-new-markets to include)")
                df = df[is_known]
        if df.empty:
            print("  no usable rows")
            continue

        print(f"  -> {len(df)} clean rows | {df['commodity'].unique().tolist()} | "
              f"{df['date'].min().date()} to {df['date'].max().date()}")
        parts.append(df)

    if not parts:
        print("\nNothing usable to merge. Stopping.")
        return
    new = pd.concat(parts, ignore_index=True)

    # ---- merge: when the same crop + market + date exists, the NEW row wins ----
    old_keys = set(zip(old["commodity"], old["market"], old["date"]))
    new_keys = set(zip(new["commodity"], new["market"], new["date"]))
    added = len(new_keys - old_keys)
    overlap = len(new_keys & old_keys)

    combined = pd.concat([old, new[old.columns]], ignore_index=True)
    combined = combined.drop_duplicates(subset=["commodity", "market", "date"], keep="last")
    combined = combined.sort_values(["commodity", "market", "date"]).reset_index(drop=True)

    print(f"\nNew rows added: {added} | rows that overlapped old data (replaced by new): {overlap}")
    print(f"Merged dataset: {len(combined)} rows (was {len(old)})")

    today = pd.Timestamp.today().normalize()
    print("\nLatest price date per crop (after merge):")
    for crop, d in combined.groupby("commodity")["date"].max().items():
        print(f"  {crop:<12} {d.date()}  ({(today - d).days} days old)")

    if not validate(combined):
        print("\nA quality check FAILED, so nothing was saved. Paste this output and I will help.")
        return

    if args.dry_run:
        print("\nDry run only: nothing was written.")
        return

    shutil.copy2(MERGED_PARQUET, BACKUP)                 # safety copy of the old dataset
    combined.to_parquet(MERGED_PARQUET, index=False)
    combined.to_csv(MERGED_CSV, index=False)
    print(f"\nSaved {MERGED_PARQUET.name} and {MERGED_CSV.name}. Old copy backed up to {BACKUP}")


if __name__ == "__main__":
    main()