from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import os

from backend.app.auth import register_user, login_user
from pydantic import BaseModel

from ml_pipeline.harvest_and_mandi import get_harvest_recommendation, get_best_mandi


# These define what data we expect farmers to send when registering/logging in
class RegisterRequest(BaseModel):
    name: str
    mobile_number: str
    password: str
    district: str
class LoginRequest(BaseModel):
    mobile_number: str
    password: str

# Create the FastAPI app - this is the "server" object everything attaches to
app = FastAPI(title="KhedutMitra API")

# CORS lets our React frontend (running on a different domain) call this API.
# Without this, browsers block the requests for security reasons.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For now, allow any website to call this API
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths to our data and models (relative to where this file lives)
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "mandi_prices_merged.parquet")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Load the dataset once when the server starts (not on every request - that would be slow)
df = pd.read_parquet(DATA_PATH)


@app.get("/")
def home():
    """A simple welcome message, useful to confirm the API is running."""
    return {"message": "Welcome to KhedutMitra API", "status": "running"}


@app.get("/crops")
def get_crops():
    """Returns the list of all crops we have data for."""
    crops = sorted(df["commodity"].unique().tolist())
    return {"crops": crops}


@app.get("/markets/{commodity}")
def get_markets(commodity: str):
    """Returns the list of mandis (markets) that trade a given crop."""
    crop_df = df[df["commodity"].str.lower() == commodity.lower()]
    if crop_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {commodity}")
    markets = sorted(crop_df["market"].unique().tolist())
    return {"commodity": commodity, "markets": markets}


@app.get("/prices/{commodity}")
def get_price_history(commodity: str, market: str = None, limit: int = 90):
    """
    Returns recent price history for a crop.
    Optional 'market' filter narrows it to one mandi.
    'limit' controls how many recent days to return (default 90 days).
    """
    crop_df = df[df["commodity"].str.lower() == commodity.lower()]

    if crop_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {commodity}")

    if market:
        crop_df = crop_df[crop_df["market"].str.lower() == market.lower()]
        if crop_df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for market: {market}")

    # Group by date and average across mandis (or just one, if filtered)
    daily = crop_df.groupby("date").agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    ).reset_index()

    daily = daily.sort_values("date").tail(limit)

    # Convert to a simple list of records that's easy for the frontend to use
    records = daily.to_dict(orient="records")
    for r in records:
        r["date"] = r["date"].strftime("%Y-%m-%d")

    return {"commodity": commodity, "market": market or "all", "data": records}


@app.get("/forecast/price/{commodity}")
def get_price_forecast(commodity: str):
    """
    Returns a simple forecast for next week's price using the saved model.
    """
    model_path = os.path.join(MODELS_DIR, f"{commodity.replace(' ', '_')}_price_model.pkl")

    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=404,
            detail=f"No trained model found for {commodity}. Available models use the baseline for this crop."
        )

    model = joblib.load(model_path)

    # Build the most recent feature values from real data to feed into the model
    crop_df = df[df["commodity"].str.lower() == commodity.lower()].copy()
    crop_df = crop_df.set_index("date")
    weekly = crop_df.resample("W").agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    ).reset_index()

    weekly["lag_1"] = weekly["price"].shift(1)
    weekly["lag_2"] = weekly["price"].shift(2)
    weekly["lag_4"] = weekly["price"].shift(4)
    weekly["rolling_mean_4"] = weekly["price"].shift(1).rolling(window=4).mean()
    weekly["rolling_mean_8"] = weekly["price"].shift(1).rolling(window=8).mean()
    weekly["arrivals_lag_1"] = weekly["arrivals"].shift(1)
    weekly["month"] = weekly["date"].dt.month

    latest = weekly.dropna().iloc[-1]

    feature_cols = ["lag_1", "lag_2", "lag_4", "rolling_mean_4",
                     "rolling_mean_8", "arrivals_lag_1", "month"]

    # Keep as a DataFrame with column names, matching how the model was
    # trained (avoids a harmless but noisy sklearn warning)
    X = latest[feature_cols].to_frame().T

    predicted_price = model.predict(X)[0]

    return {
        "commodity": commodity,
        "current_price": round(latest["price"], 2),
        "predicted_next_week_price": round(predicted_price, 2),
        "last_updated": latest["date"].strftime("%Y-%m-%d")
    }


@app.get("/harvest-window/{commodity}")
def harvest_window(commodity: str):
    """
    Returns the full harvest recommendation for a crop: typical sowing/
    harvest months, price forecast direction, best mandi, and plain-
    language advice - combining Module 5's rule-based logic.
    """
    result = get_harvest_recommendation(commodity)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/best-mandi/{commodity}")
def best_mandi(commodity: str):
    """Returns which mandi has paid the best price recently for a crop."""
    result = get_best_mandi(df, commodity)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No mandi data found for {commodity}")
    return {"commodity": commodity, **result}

@app.post("/auth/register")
def register(data: RegisterRequest):
    """Create a new farmer account."""
    result = register_user(data.name, data.mobile_number, data.password, data.district)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/auth/login")
def login(data: LoginRequest):
    """Log in an existing farmer."""
    result = login_user(data.mobile_number, data.password)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result