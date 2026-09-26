"""
KhedutMitra - Authentication Module
Handles farmer registration and login using MongoDB for storage.
Passwords are never stored in plain text - they are hashed (scrambled
in a one-way way) using bcrypt, a standard, secure hashing algorithm.
"""

import os
import bcrypt
from datetime import datetime, timedelta
from pymongo import MongoClient
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
SECRET_KEY = "khedutmitra-secret-key-change-this-later"  # Used to sign login tokens
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

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


def register_user(name, mobile_number, password, district):
    """
    Create a new farmer account. Returns an error message if the
    mobile number is already registered, otherwise creates the account.
    """
    existing_user = users_collection.find_one({"mobile_number": mobile_number})
    if existing_user:
        return {"success": False, "error": "This mobile number is already registered."}

    new_user = {
        "name": name,
        "mobile_number": mobile_number,
        "password_hash": hash_password(password),
        "district": district,
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(new_user)

    token = create_access_token(mobile_number)
    return {"success": True, "token": token, "name": name}


def login_user(mobile_number, password):
    """
    Check a farmer's mobile number and password against the database.
    Returns a login token if correct, or an error if not.
    """
    user = users_collection.find_one({"mobile_number": mobile_number})
    if not user:
        return {"success": False, "error": "No account found with this mobile number."}

    if not verify_password(password, user["password_hash"]):
        return {"success": False, "error": "Incorrect password."}

    token = create_access_token(mobile_number)
    return {"success": True, "token": token, "name": user["name"]}