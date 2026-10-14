from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

from backend.app.auth import register_user, login_user
from backend.app.weather import get_weather_outlook   # 7-day rain outlook
from backend.app.production import get_production_summary   # historical production statistics
from backend.app.assistant import answer_question   # NEW: Gemini AI assistant
from pydantic import BaseModel

from ml_pipeline.harvest_and_mandi import get_harvest_recommendation, get_best_mandi, get_price_direction


# These define what data we expect farmers to send when registering/logging in
class RegisterRequest(BaseModel):
    name: str
    mobile_number: str
    password: str
    district: str
class LoginRequest(BaseModel):
    mobile_number: str
    password: str

# What the chat box sends to the assistant (NEW)
class ChatRequest(BaseModel):
    question: str
    crop: str | None = None        # crop selected on the dashboard (optional)
    language: str | None = None    # "en" or "gu"; leave empty to detect from the question

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

    # Round to 2 decimal places so the frontend doesn't show long messy numbers
    daily["price"] = daily["price"].round(2)
    daily["arrivals"] = daily["arrivals"].round(2)

    # Convert to a simple list of records that's easy for the frontend to use
    records = daily.to_dict(orient="records")
    for r in records:
        r["date"] = r["date"].strftime("%Y-%m-%d")

    return {"commodity": commodity, "market": market or "all", "data": records}


@app.get("/prices-aggregated/{commodity}")
def get_aggregated_prices(commodity: str, granularity: str = "daily", market: str = None):
    """
    Returns price history aggregated by day, month, or year.
    granularity can be: 'daily', 'monthly', or 'yearly'
    """
    crop_df = df[df["commodity"].str.lower() == commodity.lower()].copy()

    if crop_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {commodity}")

    if market:
        crop_df = crop_df[crop_df["market"].str.lower() == market.lower()]

    crop_df = crop_df.set_index("date")

    # Pick the resampling rule based on what the user asked for
    if granularity == "yearly":
        resample_rule = "YE"
        date_format = "%Y"
    elif granularity == "monthly":
        resample_rule = "ME"
        date_format = "%Y-%m"
    else:  # daily is the default
        resample_rule = "D"
        date_format = "%Y-%m-%d"

    aggregated = crop_df.resample(resample_rule).agg(
        price=("modal_price", "mean"),
        arrivals=("arrival_quantity", "sum")
    ).dropna().reset_index()

    # Round to 2 decimal places so the frontend doesn't show long messy numbers
    aggregated["price"] = aggregated["price"].round(2)
    aggregated["arrivals"] = aggregated["arrivals"].round(2)

    aggregated["date"] = aggregated["date"].dt.strftime(date_format)

    # For daily view, only send the most recent 90 points so the chart stays readable
    if granularity == "daily":
        aggregated = aggregated.tail(90)

    records = aggregated.to_dict(orient="records")

    return {"commodity": commodity, "granularity": granularity, "data": records}


@app.get("/forecast/price/{commodity}")
def get_price_forecast(commodity: str):
    """
    Returns the forecast for NEXT week's price.
    Uses the saved ML model where one beat the baseline in our tests; for the other
    crops (Groundnut, Castor Seed, Cumin) the forecast is the baseline
    "next week = this week". The 'method' field says which one was used.
    If the crop's latest price is too old (e.g. an off-season crop), we return a
    404 with an explanation instead of a misleading forecast.
    """
    # Match the crop name ignoring upper/lower case, e.g. "castor seed" -> "Castor Seed"
    crop_name = next((c for c in df["commodity"].unique() if c.lower() == commodity.lower()), None)
    if crop_name is None:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {commodity}")

    info = get_price_direction(df, crop_name)
    if info is None:
        raise HTTPException(status_code=404, detail=f"Not enough price history to forecast {commodity}")

    if info["stale"]:
        raise HTTPException(
            status_code=404,
            detail=(f"No recent prices for {crop_name} (last reported {info['last_updated']}, "
                    f"about {info['weeks_old']} weeks ago). Forecast not available.")
        )

    return {
        "commodity": crop_name,
        "current_price": info["current_price"],
        "predicted_next_week_price": info["predicted_price"],
        "change_percent": info["change_percent"],
        "method": info["method"],
        "last_updated": info["last_updated"],
    }


@app.get("/harvest-window/{commodity}")
def harvest_window(commodity: str):
    """
    Returns the full harvest recommendation for a crop: typical sowing/
    harvest months, price forecast direction, best mandi, 7-day weather
    outlook, and plain-language advice - combining rule-based logic.
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


@app.get("/weather/{commodity}")
def weather_outlook(commodity: str):
    """
    Returns the next 7 days of weather (rain, temperature) for the district
    where this crop is grown, plus a simple rain-risk level for harvesting.
    If the weather source is unavailable we still return 200 with available=False,
    so the dashboard keeps working without weather.
    """
    result = get_weather_outlook(commodity)
    if not result["available"] and "district" not in result:
        # "district" is missing only when the crop name itself is unknown
        raise HTTPException(status_code=404, detail=result["message"])
    return {"commodity": commodity, **result}


@app.get("/production/{commodity}")
def production_statistics(commodity: str):
    """
    Historical production statistics (1997-2012) for a crop in Gujarat: the
    state-wide yearly trend (production, area, yield) and the top producing
    districts. A crop we track but have no production data for (e.g. Cumin)
    returns 200 with available=False, so the dashboard can show a message.
    """
    # Match the crop name ignoring upper/lower case
    crop_name = next((c for c in df["commodity"].unique() if c.lower() == commodity.lower()), None)
    if crop_name is None:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {commodity}")
    return {"commodity": crop_name, **get_production_summary(crop_name)}


# NEW ENDPOINT (#13)
@app.post("/assistant/chat")
def assistant_chat(data: ChatRequest, request: Request):
    """
    AI assistant: answers a farmer's question (English or Gujarati) using only our
    own price, weather, mandi and production facts. Always returns 200: if the
    assistant is unavailable or the visitor is over the rate limit, 'available'
    is False and 'message' explains why, so the chat box can show it.
    """
    # Behind Render's proxy the real visitor address is in X-Forwarded-For
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return answer_question(data.question, data.crop, data.language, ip)


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