"""
check_arrival_features.py
Safety check: for a past week W, the features built by the live forecast code (using only
the weeks BEFORE W) must equal the features built by train_arrival_models.py for week W.
Run from the project root:  python ml_pipeline\\check_arrival_features.py
"""
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, "ml_pipeline")
from train_arrival_models import build_weekly_series, add_features   # the training code
from harvest_and_mandi import _arrival_features, ARRIVAL_FEATURE_COLS  # the live code

df = pd.read_parquet("data/processed/mandi_prices_merged.parquet")
all_ok = True
for crop in ["Groundnut", "Bajra", "Cumin", "Mustard", "Sesame", "Castor Seed"]:
    full = build_weekly_series(df, crop)          # training's weekly table
    train_rows = add_features(full)               # training's feature rows
    for back in (5, 20):                          # two different past weeks
        row = train_rows.iloc[-back]
        week = row["date"]
        before = full[full["date"] < week].set_index("date")      # only weeks before W
        mine, _ = _arrival_features(before)
        ok = all(np.isclose(float(mine[c]), float(row[c])) for c in ARRIVAL_FEATURE_COLS)
        all_ok = all_ok and ok
        print(f"{crop:<12} week {week.date()}: {'OK' if ok else 'MISMATCH'}")
        if not ok:
            for c in ARRIVAL_FEATURE_COLS:
                print(f"    {c}: live={mine[c]}  training={row[c]}")
print("\nALL MATCH" if all_ok else "\nSOME MISMATCH - paste this output")