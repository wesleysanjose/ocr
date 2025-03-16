# database.py
from pymongo import MongoClient, ASCENDING
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class Database:
    client: Optional[MongoClient] = None
    db = None

    def connect_db(self, connection_uri="mongodb://localhost:27017", db_name="disability_assessment"):
        """Connect to MongoDB using synchronous PyMongo driver"""
        # Previously was async def connect_db
        if self.client is None:
            try:
                logger.info(f"Connecting to MongoDB at {connection_uri}")
                self.client = MongoClient(connection_uri)
                self.db = self.client[db_name]
                
                # Create indexes
                self.db.cases.create_index([("case_number", ASCENDING)], unique=True)
                self.db.cases.create_index([("status", ASCENDING)])
                self.db.cases.create_index([("create_time", ASCENDING)])
                self.db.cases.create_index([("name", ASCENDING)])
                
                logger.info(f"Connected to MongoDB at {connection_uri}, database: {db_name}")
                return self.db
            except Exception as e:
                logger.error(f"Database connection error: {e}")
                raise
        return self.db

    def close_db(self):
        """Close database connection"""
        if self.client:
            logger.info("Database connection closed")
            self.client.close()
            self.client = None
            self.db = None

db = Database()