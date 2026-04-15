import os

SECRET_KEY = os.getenv("SECRET_KEY", "v2-contract-system-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480
DATABASE_URL = "sqlite:///contract_v2.db"
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
