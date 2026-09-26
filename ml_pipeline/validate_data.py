import pandas as pd

DATA_PATH = "data/processed/mandi_prices_merged.parquet"


def check_no_missing_values(df):
    """Check 1: Are there any missing values in important columns?"""
    important_cols = ["date", "commodity", "market", "modal_price"]
    missing_counts = df[important_cols].isnull().sum()
    total_missing = missing_counts.sum()

    if total_missing == 0:
        print("PASS: No missing values in important columns.")
    else:
        print("FAIL: Missing values found:")
        print(missing_counts[missing_counts > 0])
    return total_missing == 0


def check_prices_are_positive(df):
    """Check 2: Are all prices greater than zero?"""
    bad_rows = df[df["modal_price"] <= 0]
    if len(bad_rows) == 0:
        print("PASS: All prices are positive.")
    else:
        print(f"FAIL: {len(bad_rows)} rows have zero or negative prices.")
    return len(bad_rows) == 0


def check_prices_realistic_range(df):
    """Check 3: Are prices within a realistic range (not absurdly high/low)?
    Modal prices in Rs./Quintal for these crops are typically between 500 and 50,000."""
    bad_rows = df[(df["modal_price"] < 100) | (df["modal_price"] > 100000)]
    if len(bad_rows) == 0:
        print("PASS: All prices are within a realistic range (100 to 100,000).")
    else:
        print(f"WARNING: {len(bad_rows)} rows have unusual prices. Review these:")
        print(bad_rows[["commodity", "market", "date", "modal_price"]].head(10))
    return len(bad_rows) == 0


def check_no_duplicate_records(df):
    """Check 4: Are there duplicate rows (same commodity, market, and date)?"""
    duplicates = df.duplicated(subset=["commodity", "market", "date"]).sum()
    if duplicates == 0:
        print("PASS: No duplicate commodity-market-date records.")
    else:
        print(f"FAIL: {duplicates} duplicate records found.")
    return duplicates == 0


def check_dates_in_expected_range(df):
    """Check 5: Are all dates within our expected collection period?"""
    min_date = df["date"].min()
    max_date = df["date"].max()
    expected_start = pd.Timestamp("2021-01-01")
    expected_end = pd.Timestamp("2026-09-24")

    if min_date >= expected_start and max_date <= expected_end:
        print(f"PASS: All dates fall between {expected_start.date()} and {expected_end.date()}.")
    else:
        print(f"WARNING: Found dates outside expected range: {min_date.date()} to {max_date.date()}")
    return min_date >= expected_start and max_date <= expected_end


def main():
    print("Loading dataset...")
    df = pd.read_parquet(DATA_PATH)
    print(f"Loaded {len(df)} rows.\n")

    print("Running data quality checks:")
    print("-" * 50)

    results = []
    results.append(check_no_missing_values(df))
    results.append(check_prices_are_positive(df))
    results.append(check_prices_realistic_range(df))
    results.append(check_no_duplicate_records(df))
    results.append(check_dates_in_expected_range(df))

    print("-" * 50)
    passed = sum(results)
    total = len(results)
    print(f"\nSummary: {passed}/{total} checks passed.")

    if passed == total:
        print("All checks passed. Data is ready for analysis and modeling.")
    else:
        print("Some checks need attention before proceeding.")


if __name__ == "__main__":
    main()