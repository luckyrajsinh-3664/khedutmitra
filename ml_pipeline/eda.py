import pandas as pd
import matplotlib.pyplot as plt
import os

DATA_PATH = "data/processed/mandi_prices_merged.parquet"
OUTPUT_DIR = "ml_pipeline/eda_charts"

os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_data():
    df = pd.read_parquet(DATA_PATH)
    # Add helper columns for grouping by time
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["month_name"] = df["date"].dt.strftime("%b")
    return df


def chart_price_trend_per_crop(df):
    """Chart 1: How has each crop's average price changed over time?"""
    plt.figure(figsize=(14, 7))

    for commodity in df["commodity"].unique():
        crop_df = df[df["commodity"] == commodity]
        # Group by month to smooth out daily noise
        monthly_avg = crop_df.groupby(crop_df["date"].dt.to_period("M"))["modal_price"].mean()
        plt.plot(monthly_avg.index.astype(str), monthly_avg.values, label=commodity)

    plt.title("Monthly Average Price Trend by Crop (2021-2026)")
    plt.xlabel("Month")
    plt.ylabel("Modal Price (Rs./Quintal)")
    plt.xticks(rotation=90, fontsize=6)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/1_price_trend_per_crop.png", dpi=150)
    plt.close()
    print("Saved: 1_price_trend_per_crop.png")


def chart_seasonal_pattern(df):
    """Chart 2: Do prices follow a seasonal pattern (same months each year)?"""
    fig, axes = plt.subplots(3, 3, figsize=(16, 12))
    axes = axes.flatten()

    for idx, commodity in enumerate(df["commodity"].unique()):
        crop_df = df[df["commodity"] == commodity]
        monthly_avg = crop_df.groupby("month")["modal_price"].mean()

        axes[idx].bar(monthly_avg.index, monthly_avg.values, color="steelblue")
        axes[idx].set_title(commodity, fontsize=10)
        axes[idx].set_xlabel("Month")
        axes[idx].set_ylabel("Avg Price")

    plt.suptitle("Seasonal Price Pattern by Crop (Average Across All Years)", fontsize=14)
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/2_seasonal_pattern.png", dpi=150)
    plt.close()
    print("Saved: 2_seasonal_pattern.png")


def chart_price_by_market(df):
    """Chart 3: How do prices differ across mandis, for one example crop?"""
    # Pick Groundnut as the example since it has multiple markets
    example_crop = "Groundnut"
    crop_df = df[df["commodity"] == example_crop]

    market_avg = crop_df.groupby("market")["modal_price"].mean().sort_values(ascending=False)

    plt.figure(figsize=(10, 6))
    plt.barh(market_avg.index, market_avg.values, color="darkgreen")
    plt.title(f"Average Price by Market - {example_crop}")
    plt.xlabel("Average Modal Price (Rs./Quintal)")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/3_price_by_market.png", dpi=150)
    plt.close()
    print("Saved: 3_price_by_market.png")


def chart_arrival_vs_price(df):
    """Chart 4: Does higher arrival quantity relate to lower price? (supply vs demand)"""
    example_crop = "Groundnut"
    crop_df = df[df["commodity"] == example_crop]

    plt.figure(figsize=(10, 6))
    plt.scatter(crop_df["arrival_quantity"], crop_df["modal_price"], alpha=0.4, s=10)
    plt.title(f"Arrival Quantity vs Price - {example_crop}")
    plt.xlabel("Arrival Quantity (Metric Tonnes)")
    plt.ylabel("Modal Price (Rs./Quintal)")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/4_arrival_vs_price.png", dpi=150)
    plt.close()
    print("Saved: 4_arrival_vs_price.png")


def print_summary_stats(df):
    """Print basic summary statistics for the report."""
    print("\n--- Summary Statistics ---")
    summary = df.groupby("commodity")["modal_price"].agg(["mean", "min", "max", "std"]).round(2)
    print(summary)


def main():
    df = load_data()
    print(f"Loaded {len(df)} rows for EDA.\n")

    chart_price_trend_per_crop(df)
    chart_seasonal_pattern(df)
    chart_price_by_market(df)
    chart_arrival_vs_price(df)

    print_summary_stats(df)

    print(f"\nAll charts saved to: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()