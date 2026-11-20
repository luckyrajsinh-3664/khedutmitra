"""
watchlist.py
"My Watchlist": a logged-in farmer follows crops, optionally with a target price, and the app
shows alerts when something worth knowing happens.

Every endpoint needs the login token (Authorization: Bearer <token>). The farmer is identified
by the token, so nobody can read or change another farmer's watchlist.

Alerts are worked out live from our own price data and forecast (same rules as the dashboard):
  - the current price reached the target
  - next week's forecast may reach the target
  - the forecast shows a big move (5% or more)
  - the price moved sharply last week (forecast unreliable) / price data is old
The "current price" is the weekly average over all mandis, not one mandi's price.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from backend.app.auth import db, verify_token
from ml_pipeline.harvest_and_mandi import get_price_direction

watchlist_collection = db["watchlist"]   # one document per (farmer, crop)

# Reads "Authorization: Bearer <token>". auto_error=False so we can send our own 401 message.
# (This also gives the /docs page an "Authorize" button for testing.)
bearer_scheme = HTTPBearer(auto_error=False)

BIG_MOVE_PCT = 5   # a forecast change of at least this many percent raises an alert

TEXT = {
    "en": {
        "hit_above": "Current price Rs. {price} is above your target of Rs. {target}.",
        "hit_below": "Current price Rs. {price} is below your target of Rs. {target}.",
        "near_above": "Next week's forecast (Rs. {pred}) may reach your target of Rs. {target}.",
        "near_below": "Next week's forecast (Rs. {pred}) may fall to your target of Rs. {target}.",
        "move_up": "Forecast shows a rise of {pct}% next week.",
        "move_down": "Forecast shows a fall of {pct}% next week.",
        "sharp": "Price moved sharply last week ({pct}%), so the forecast is unreliable. Check the price at your local mandi.",
        "stale": "No recent prices for this crop (last reported {date}).",
        "no_data": "Not enough price data for this crop.",
    },
    "gu": {
        "hit_above": "હાલનો ભાવ રૂ. {price} તમારા લક્ષ્ય રૂ. {target} કરતાં વધુ છે.",
        "hit_below": "હાલનો ભાવ રૂ. {price} તમારા લક્ષ્ય રૂ. {target} કરતાં ઓછો છે.",
        "near_above": "આવતા અઠવાડિયાની આગાહી (રૂ. {pred}) તમારા લક્ષ્ય રૂ. {target} સુધી પહોંચી શકે છે.",
        "near_below": "આવતા અઠવાડિયાની આગાહી (રૂ. {pred}) તમારા લક્ષ્ય રૂ. {target} સુધી ઘટી શકે છે.",
        "move_up": "આગાહી મુજબ આવતા અઠવાડિયે ભાવ {pct}% વધશે.",
        "move_down": "આગાહી મુજબ આવતા અઠવાડિયે ભાવ {pct}% ઘટશે.",
        "sharp": "ગયા અઠવાડિયે ભાવમાં મોટો ફેરફાર થયો ({pct}%), તેથી આગાહી ભરોસાપાત્ર નથી. સ્થાનિક માર્કેટ યાર્ડમાં ભાવ તપાસો.",
        "stale": "આ પાક માટે તાજેતરના ભાવ ઉપલબ્ધ નથી (છેલ્લે {date} ના રોજ નોંધાયા).",
        "no_data": "આ પાક માટે પૂરતા ભાવના આંકડા ઉપલબ્ધ નથી.",
    },
}


class WatchItem(BaseModel):
    crop: str
    target_price: float | None = None   # optional: leave empty to just follow the crop
    direction: str = "above"            # alert when the price goes "above" or "below" the target


def _current_farmer(credentials):
    """Return the farmer's mobile number from the bearer token, or raise 401."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Login required.")
    mobile = verify_token(credentials.credentials.strip())
    if not mobile:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return mobile


def _build_item(df, crop, target, direction, lang):
    """Current price, forecast and alerts for one watched crop."""
    text = TEXT["gu" if lang == "gu" else "en"]
    item = {"crop": crop, "target_price": target, "direction": direction, "alerts": []}

    try:
        info = get_price_direction(df, crop)
    except Exception:
        info = None

    if info is None:
        item["status"] = "no_data"
        item["alerts"].append({"kind": "warn", "text": text["no_data"]})
        return item
    if info["stale"]:
        item["status"] = "stale"
        item["current_price"] = info["current_price"]
        item["last_updated"] = info["last_updated"]
        item["alerts"].append({"kind": "warn", "text": text["stale"].format(date=info["last_updated"])})
        return item

    current, predicted = info["current_price"], info["predicted_price"]
    item.update({
        "status": "ok",
        "current_price": current,
        "predicted_price": predicted,
        "change_percent": info["change_percent"],
        "direction_forecast": info["direction"],
        "sharp_move": info["sharp_move"],
        "last_updated": info["last_updated"],
    })

    # 1) target price alerts
    if target:
        if direction == "below":
            if current <= target:
                item["alerts"].append({"kind": "hit", "text": text["hit_below"].format(price=current, target=target)})
            elif predicted <= target and not info["sharp_move"]:
                item["alerts"].append({"kind": "near", "text": text["near_below"].format(pred=predicted, target=target)})
        else:
            if current >= target:
                item["alerts"].append({"kind": "hit", "text": text["hit_above"].format(price=current, target=target)})
            elif predicted >= target and not info["sharp_move"]:
                item["alerts"].append({"kind": "near", "text": text["near_above"].format(pred=predicted, target=target)})

    # 2) sharp weekly move (forecast unreliable) or a big forecast move
    if info["sharp_move"]:
        item["alerts"].append({"kind": "warn", "text": text["sharp"].format(pct=f"{info['weekly_move_percent']:+.0f}")})
    elif abs(info["change_percent"]) >= BIG_MOVE_PCT:
        key = "move_up" if info["change_percent"] > 0 else "move_down"
        item["alerts"].append({"kind": "info", "text": text[key].format(pct=abs(info["change_percent"]))})

    return item


def create_watchlist_router(df):
    """Builds the /watchlist endpoints (df = the price table already loaded by main.py)."""
    router = APIRouter()

    @router.get("/watchlist")
    def get_watchlist(lang: str = "en",
                      credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
        """The farmer's watchlist, each crop with its current price, forecast and alerts."""
        mobile = _current_farmer(credentials)
        docs = watchlist_collection.find({"mobile_number": mobile}).sort("created_at", 1)
        items = [_build_item(df, d["crop"], d.get("target_price"), d.get("direction", "above"), lang) for d in docs]
        alert_count = sum(1 for it in items for a in it["alerts"] if a["kind"] in ("hit", "near"))
        return {"items": items, "alert_count": alert_count}

    @router.post("/watchlist")
    def add_to_watchlist(data: WatchItem,
                         credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
        """Add a crop (or change its target price). One entry per crop."""
        mobile = _current_farmer(credentials)

        crop_name = next((c for c in df["commodity"].unique() if c.lower() == data.crop.strip().lower()), None)
        if crop_name is None:
            raise HTTPException(status_code=404, detail=f"No data found for crop: {data.crop}")
        if data.direction not in ("above", "below"):
            raise HTTPException(status_code=400, detail="direction must be 'above' or 'below'")
        if data.target_price is not None and not (0 < data.target_price < 1_000_000):
            raise HTTPException(status_code=400, detail="Target price must be between 0 and 1,000,000.")

        now = datetime.utcnow()
        watchlist_collection.update_one(
            {"mobile_number": mobile, "crop": crop_name},
            {"$set": {"target_price": data.target_price, "direction": data.direction, "updated_at": now},
             "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        return {"success": True, "crop": crop_name}

    @router.delete("/watchlist/{crop}")
    def remove_from_watchlist(crop: str,
                              credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
        """Remove a crop from the farmer's watchlist."""
        mobile = _current_farmer(credentials)
        result = watchlist_collection.delete_one({"mobile_number": mobile, "crop": crop})
        return {"success": True, "removed": result.deleted_count}

    return router