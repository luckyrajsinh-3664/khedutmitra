import pandas as pd
import os
import glob

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"

os.makedirs(PROCESSED_DIR, exist_ok=True)

def load_and_clean_file(filepath):
    """Load a single Agmarknet CSV, skip the junk title row, and standardize columns."""
    df = pd.read_csv(filepath, skiprows=1)

    # Standardize column names regardless of the exact date range in the header
    rename_map = {}
    for col in df.columns:
        if col.startswith("Arrival Quantity"):
            rename_map[col] = "arrival_quantity"
        elif col.startswith("Modal Price"):
            rename_map[col] = "modal_price"
    df = df.rename(columns=rename_map)

    df = df.rename(columns={
        "State/UT": "state",
        "District": "district",
        "Market": "market",
        "Commodity Group": "commodity_group",
        "Commodity": "commodity",
        "Date": "date",
        "Arrival Unit": "arrival_unit",
        "Price Unit": "price_unit"
    })

    # Keep only the columns we need
    expected_cols = ["state", "district", "market", "commodity_group",
                      "commodity", "date", "arrival_quantity",
                      "arrival_unit", "modal_price", "price_unit"]
    df = df[[c for c in expected_cols if c in df.columns]]

    return df


def clean_dataframe(df):
    """Clean types, dates, and drop invalid rows."""
    # Parse date (Agmarknet format is DD-MM-YYYY)
    df["date"] = pd.to_datetime(df["date"], format="%d-%m-%Y", errors="coerce")

    # Convert numeric columns
    df["arrival_quantity"] = pd.to_numeric(df["arrival_quantity"], errors="coerce")
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")

    # Drop rows with missing critical values
    before = len(df)
    df = df.dropna(subset=["date", "modal_price"])
    after = len(df)
    print(f"  Dropped {before - after} rows with missing date/price")

    # Drop rows with non-positive prices (invalid data)
    df = df[df["modal_price"] > 0]

    # Remove exact duplicate rows
    df = df.drop_duplicates()

    # Sort chronologically
    df = df.sort_values(["commodity", "market", "date"]).reset_index(drop=True)

    return df


def main():
    csv_files = glob.glob(os.path.join(RAW_DIR, "*.csv"))
    print(f"Found {len(csv_files)} raw CSV files.\n")

    all_dfs = []
    for filepath in csv_files:
        filename = os.path.basename(filepath)
        print(f"Processing {filename} ...")
        df = load_and_clean_file(filepath)
        df = clean_dataframe(df)
        print(f"  -> {len(df)} clean rows | Commodities: {df['commodity'].unique().tolist()}")
        all_dfs.append(df)

    # Merge everything into one dataset
    merged = pd.concat(all_dfs, ignore_index=True)
    merged = merged.drop_duplicates()

    # Simplify long/messy commodity names into clean, readable names
    name_fixes = {
        "Bajra(Pearl Millet/Cumbu)": "Bajra",
        "Bengal Gram(Gram)(Whole)": "Chickpea",
        "Cummin Seed(Jeera)": "Cumin",
        "Sesamum(Sesame,Gingelly,Til)": "Sesame",
    }
    merged["commodity"] = merged["commodity"].replace(name_fixes)

    print(f"\nTotal merged rows: {len(merged)}")
    print(f"Unique commodities: {merged['commodity'].nunique()}")
    print(f"Unique markets: {merged['market'].nunique()}")
    print(f"Date range: {merged['date'].min()} to {merged['date'].max()}")

    # Save as Parquet (efficient) and also CSV (easy to inspect)
    out_parquet = os.path.join(PROCESSED_DIR, "mandi_prices_merged.parquet")
    out_csv = os.path.join(PROCESSED_DIR, "mandi_prices_merged.csv")

    merged.to_parquet(out_parquet, index=False)
    merged.to_csv(out_csv, index=False)

    print(f"\nSaved merged dataset to:\n  {out_parquet}\n  {out_csv}")


if __name__ == "__main__":
    main()