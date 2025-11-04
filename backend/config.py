import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASSWORD', '')}@{os.getenv('DB_HOST', 'localhost')}/{os.getenv('DB_NAME', 'training_portal')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = False  # Set to False for development, configure in production
    RAGFLOW_BASE_URL = os.getenv('RAGFLOW_BASE_URL', 'http://localhost:80')
    RAGFLOW_API_KEY = os.getenv('RAGFLOW_API_KEY', '')

