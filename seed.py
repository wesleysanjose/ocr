# seed.py
from pymongo import MongoClient
from datetime import datetime, timedelta
import uuid
import random
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)8s] %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# MongoDB connection settings
MONGODB_URI = "mongodb://localhost:27017"
DB_NAME = "disability_assessment"

def connect_to_db():
    """Connect to MongoDB"""
    try:
        client = MongoClient(MONGODB_URI)
        db = client[DB_NAME]
        logger.info(f"Connected to MongoDB at {MONGODB_URI}, database: {DB_NAME}")
        return client, db
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def create_sample_cases(db, num_cases=10):
    """Create sample cases in the database"""
    case_types = ["交通事故", "工伤认定", "医疗事故", "其他伤害"]
    status_types = ["待处理", "进行中", "待审核", "已完成"]
    
    # Set up case numbers
    prefix = "JD" + datetime.now().strftime("%Y%m")
    
    # Create or get counter for case numbers
    counter = db.counters.find_one_and_update(
        {"_id": "case_number"},
        {"$inc": {"seq": num_cases}},
        upsert=True,
        return_document=True
    )
    start_seq = counter["seq"] - num_cases + 1
    
    # Generate sample cases
    cases = []
    for i in range(num_cases):
        # Create random dates within the last 90 days
        days_ago = random.randint(0, 90)
        create_date = datetime.now() - timedelta(days=days_ago)
        update_date = create_date + timedelta(days=random.randint(0, min(days_ago, 30)))
        
        case = {
            "case_number": f"{prefix}{start_seq + i:03d}",
            "name": f"测试客户{i+1}",
            "phone": f"1380013{random.randint(1000, 9999)}",
            "type": random.choice(case_types),
            "status": random.choice(status_types),
            "create_time": create_date,
            "update_time": update_date,
            "documents": []
        }
        
        # Add random documents to some cases
        if random.random() > 0.3:  # 70% chance to have documents
            num_docs = random.randint(1, 3)
            for j in range(num_docs):
                doc_type_options = ["医院病历", "事故认定书", "诊断证明", "伤情照片", "其他资料"]
                
                document = {
                    "id": str(uuid.uuid4()),
                    "filename": f"sample_document_{j+1}.pdf",
                    "file_type": "application/pdf",
                    "upload_time": update_date - timedelta(days=random.randint(0, 5)),
                    "document_type": random.choice(doc_type_options),
                    "preview_url": None,
                    "raw_text": f"这是一份示例文档内容 {j+1}，属于案件 {case['case_number']}。",
                    "processed_text": {
                        "姓名": case["name"],
                        "诊断结果": "轻微伤" if random.random() > 0.5 else "重伤",
                        "受伤部位": random.choice(["头部", "胸部", "腿部", "手臂", "腰部"]),
                        "医院": random.choice(["第一人民医院", "市中心医院", "协和医院"])
                    }
                }
                
                case["documents"].append(document)
        
        cases.append(case)
    
    return cases

def seed_database():
    """Seed the database with sample data"""
    client, db = connect_to_db()
    
    try:
        # Clear existing data
        logger.info("Clearing existing data...")
        db.cases.delete_many({})
        
        # Create sample cases
        logger.info("Creating sample cases...")
        cases = create_sample_cases(db, 20)
        
        # Insert cases
        result = db.cases.insert_many(cases)
        logger.info(f"Successfully inserted {len(result.inserted_ids)} cases")
        
        # Count by status for verification
        status_counts = {}
        for status in ["待处理", "进行中", "待审核", "已完成"]:
            count = db.cases.count_documents({"status": status})
            status_counts[status] = count
        
        logger.info(f"Cases by status: {status_counts}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        return False
    
    finally:
        client.close()
        logger.info("Database connection closed")

if __name__ == "__main__":
    logger.info("Starting database seeding...")
    success = seed_database()
    if success:
        logger.info("Database seeding completed successfully!")
    else:
        logger.error("Database seeding failed!")