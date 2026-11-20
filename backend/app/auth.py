"""
KhedutMitra - Authentication Module
Handles farmer registration and login using MongoDB for storage.
Passwords are never stored in plain text - they are hashed (scrambled
in a one-way way) using bcrypt, a standard, secure hashing algorithm.
"""

import os
import secrets
import bcrypt
from datetime import datetime, timedelta
from pymongo import MongoClient
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

# The secret used to sign login tokens must NOT be written in the code (this repo is public).
# It comes from the JWT_SECRET environment variable (.env locally, Render's environment on the server).
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    # No secret configured: use a random temporary one so we never fall back to a known key.
    # Tokens signed with it stop working when the server restarts.
    SECRET_KEY = secrets.token_hex(32)
    print("WARNING: JWT_SECRET is not set - using a temporary random key. Set JWT_SECRET in .env / Render.")

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

# Languages a farmer can choose: English ("en") or Gujarati ("gu")
SUPPORTED_LANGUAGES = ("en", "gu")

# Connect to MongoDB once when this module loads
client = MongoClient(MONGODB_URI)
db = client["khedutmitra"]  # database name
users_collection = db["users"]  # like a "table" for farmer accounts


def hash_password(plain_password):
    """Scramble a password so it's never stored in readable form."""
    password_bytes = plain_password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")  # store as a plain string in MongoDB


def verify_password(plain_password, hashed_password):
    """Check if a typed password matches the stored scrambled version."""
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(mobile_number):
    """
    Create a login token (JWT) that proves this user is logged in.
    The frontend stores this and sends it with future requests.
    """
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": mobile_number, "exp": expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def register_user(name, mobile_number, password, district, language="en"):
    """
    Create a new farmer account. Returns an error message if the
    mobile number is already registered, otherwise creates the account.
    'language' is the farmer's preferred language ("en" or "gu"); anything else becomes "en".
    """
    existing_user = users_collection.find_one({"mobile_number": mobile_number})
    if existing_user:
        return {"success": False, "error": "This mobile number is already registered."}

    if language not in SUPPORTED_LANGUAGES:
        language = "en"

    new_user = {
        "name": name,
        "mobile_number": mobile_number,
        "password_hash": hash_password(password),
        "district": district,
        "language": language,
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(new_user)

    token = create_access_token(mobile_number)
    return {"success": True, "token": token, "name": name, "language": language}


def login_user(mobile_number, password):
    """
    Check a farmer's mobile number and password against the database.
    Returns a login token (and the farmer's preferred language) if correct, or an error if not.
    """
    user = users_collection.find_one({"mobile_number": mobile_number})
    if not user:
        return {"success": False, "error": "No account found with this mobile number."}

    if not verify_password(password, user["password_hash"]):
        return {"success": False, "error": "Incorrect password."}

    token = create_access_token(mobile_number)
    # Accounts created before this feature have no saved language -> English
    return {"success": True, "token": token, "name": user["name"], "language": user.get("language", "en")}