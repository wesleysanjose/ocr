# database.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
import logging
from threading import local

logger = logging.getLogger(__name__)

# Thread-local storage for database connections
_thread_local = local()

class Database:
    client = None
    db = None

    def connect_db(self, connection_uri="mongodb://localhost:27017", db_name="disability_assessment"):
        """Synchronous wrapper for connecting to MongoDB"""
        if self.client is None:
            try:
                logger.info(f"Connecting to MongoDB at {connection_uri}")
                self.client = AsyncIOMotorClient(connection_uri)
                self.db = self.client[db_name]
                
                # Create indexes (this is synchronous)
                asyncio.run(self._create_indexes())
                
                logger.info(f"Connected to MongoDB at {connection_uri}, database: {db_name}")
                return self.db
            except Exception as e:
                logger.error(f"Database connection error: {e}")
                raise
        return self.db
    
    async def _create_indexes(self):
        """Create indexes on collections"""
        await self.db.cases.create_index([("case_number", ASCENDING)], unique=True)
        await self.db.cases.create_index([("status", ASCENDING)])
        await self.db.cases.create_index([("create_time", ASCENDING)])
        await self.db.cases.create_index([("name", ASCENDING)])

    def close_db(self):
        """Close database connection"""
        if self.client:
            logger.info("Database connection closed")
            self.client.close()
            self.client = None
            self.db = None

db = Database()