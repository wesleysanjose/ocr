from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

    async def connect_db(self, connection_uri="mongodb://localhost:27017", db_name="disability_assessment"):
        try:
            self.client = AsyncIOMotorClient(connection_uri)
            self.db = self.client[db_name]
            
            # Create indexes
            await self.db.cases.create_index([("case_number", ASCENDING)], unique=True)
            await self.db.cases.create_index([("status", ASCENDING)])
            await self.db.cases.create_index([("create_time", ASCENDING)])
            await self.db.cases.create_index([("name", ASCENDING)])
            
            logger.info(f"Connected to MongoDB at {connection_uri}, database: {db_name}")
            return self.db
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise

    async def close_db(self):
        if self.client:
            self.client.close()
            logger.info("Database connection closed")

db = Database()