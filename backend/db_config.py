"""
Database configuration for AlloyDB connection
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from google.cloud.sql.connector import Connector
import pg8000

# Initialize Cloud SQL Python Connector
connector = Connector()


def get_connection():
    """Creates a connection to AlloyDB using Cloud SQL Connector"""
    
    # Get AlloyDB connection details from environment variables
    instance_connection_name = os.environ.get('ALLOYDB_INSTANCE')  # Format: project:region:cluster:instance
    db_user = os.environ.get('ALLOYDB_USER', 'postgres')
    db_pass = os.environ.get('ALLOYDB_PASSWORD')
    db_name = os.environ.get('ALLOYDB_DATABASE', 'postgres')
    
    if not instance_connection_name:
        raise ValueError("ALLOYDB_INSTANCE environment variable not set")
    
    conn = connector.connect(
        instance_connection_name,
        "pg8000",
        user=db_user,
        password=db_pass,
        db=db_name,
    )
    return conn


def get_db_engine():
    """Creates SQLAlchemy engine for AlloyDB"""
    
    engine = create_engine(
        "postgresql+pg8000://",
        creator=get_connection,
        poolclass=NullPool,
    )
    return engine


def init_db(engine):
    """Initialize database tables"""
    
    with engine.connect() as conn:
        # Create tables if they don't exist
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_patterns (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                pattern_name VARCHAR(255) NOT NULL,
                pattern_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, pattern_name)
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_tempos (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL UNIQUE,
                tempo INTEGER NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        conn.commit()
        print("Database tables initialized successfully")


def close_connector():
    """Close the Cloud SQL connector"""
    connector.close()
