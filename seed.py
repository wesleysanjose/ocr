# seed_data.py

import pymongo
from datetime import datetime, timedelta
import hashlib
import os
import random
from bson import ObjectId

# MongoDB connection settings - note the database name matches your application
MONGO_HOST = "localhost"
MONGO_PORT = 27017
MONGO_DB = "forensic_docs_dev"  # Match your app's database name

# Connect to MongoDB
client = pymongo.MongoClient(MONGO_HOST, MONGO_PORT)
db = client[MONGO_DB]

# Clear existing data (optional)
db.clients.delete_many({})
db.users.delete_many({})
db.cases.delete_many({})
db.documents.delete_many({})
db.reports.delete_many({})

print("Existing data cleared.")

# Helper functions
def hash_password(password, salt):
    """Hash password with salt"""
    pw_hash = hashlib.sha256()
    pw_hash.update((password + salt).encode('utf-8'))
    return pw_hash.hexdigest()

def random_date(start_date, end_date):
    """Generate a random date between start_date and end_date"""
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

# Creating client/tenant data
client_ids = []
clients_data = [
    {
        "_id": ObjectId(),
        "name": "Forensic Science Laboratory",
        "tenant_code": "fsl-a1b2c3",
        "contact_email": "admin@fsl.example.com",
        "contact_name": "Dr. Jane Smith",
        "contact_phone": "+1-555-123-4567",
        "settings": {
            "logo_url": "/static/img/clients/fsl_logo.png",
            "primary_color": "#1e3a8a",
            "report_template": "standard"
        },
        "status": "active",
        "created_at": datetime(2023, 7, 15, 10, 30, 0),
        "updated_at": datetime(2023, 7, 15, 10, 30, 0),
        "deleted": False
    },
    {
        "_id": ObjectId(),
        "name": "Medical Examiner's Office",
        "tenant_code": "meo-d4e5f6",
        "contact_email": "director@meo.example.com",
        "contact_name": "Dr. Robert Johnson",
        "contact_phone": "+1-555-987-6543",
        "settings": {
            "logo_url": "/static/img/clients/meo_logo.png",
            "primary_color": "#10b981",
            "report_template": "medical"
        },
        "status": "active",
        "created_at": datetime(2023, 7, 16, 14, 45, 0),
        "updated_at": datetime(2023, 7, 16, 14, 45, 0),
        "deleted": False
    },
    {
        "_id": ObjectId(),
        "name": "Law Enforcement Agency",
        "tenant_code": "lea-g7h8i9",
        "contact_email": "chief@lea.example.com",
        "contact_name": "Chief Michael Brown",
        "contact_phone": "+1-555-456-7890",
        "settings": {
            "logo_url": "/static/img/clients/lea_logo.png",
            "primary_color": "#3b82f6",
            "report_template": "law_enforcement"
        },
        "status": "active",
        "created_at": datetime(2023, 7, 17, 9, 15, 0),
        "updated_at": datetime(2023, 8, 1, 11, 30, 0),
        "deleted": False
    }
]

# Insert clients
result = db.clients.insert_many(clients_data)
client_ids = result.inserted_ids
print(f"Added {len(client_ids)} clients")

# Create system admin user
admin_id = ObjectId()
password_salt = os.urandom(16).hex()
password_hash = hash_password("admin123", password_salt)

admin_user = {
    "_id": admin_id,
    "username": "admin",
    "email": "admin@forensic-docs.example.com",
    "password_hash": password_hash,
    "password_salt": password_salt,
    "tenant_id": None,  # System admin has no tenant
    "full_name": "System Administrator",
    "role": "admin",
    "settings": {
        "theme": "light",
        "notifications_enabled": True
    },
    "last_login": datetime.now() - timedelta(days=1),
    "status": "active",
    "created_at": datetime(2023, 7, 15, 10, 0, 0),
    "updated_at": datetime.now() - timedelta(days=1),
    "deleted": False
}

db.users.insert_one(admin_user)
print("Added system admin user")

# Create tenant users
users_data = []
user_ids = []

# Create users for each tenant
for idx, client_id in enumerate(client_ids):
    # Admin user for tenant
    password_salt = os.urandom(16).hex()
    password_hash = hash_password("password", password_salt)
    
    tenant_admin = {
        "_id": ObjectId(),
        "username": f"admin_{idx}",
        "email": f"admin{idx}@example.com",
        "password_hash": password_hash,
        "password_salt": password_salt,
        "tenant_id": client_id,
        "full_name": f"Tenant Admin {idx}",
        "role": "admin",
        "settings": {
            "theme": "light" if idx % 2 == 0 else "dark",
            "notifications_enabled": True
        },
        "last_login": datetime.now() - timedelta(days=random.randint(1, 10)),
        "status": "active",
        "created_at": datetime(2023, 7, 15 + idx, 10, 0, 0),
        "updated_at": datetime.now() - timedelta(days=random.randint(1, 10)),
        "deleted": False
    }
    users_data.append(tenant_admin)
    
    # Regular users for tenant
    for j in range(2):  # 2 regular users per tenant
        password_salt = os.urandom(16).hex()
        password_hash = hash_password("password", password_salt)
        
        regular_user = {
            "_id": ObjectId(),
            "username": f"user_{idx}_{j}",
            "email": f"user{idx}{j}@example.com",
            "password_hash": password_hash,
            "password_salt": password_salt,
            "tenant_id": client_id,
            "full_name": f"Regular User {idx}-{j}",
            "role": "user",
            "settings": {
                "theme": "light" if (idx + j) % 2 == 0 else "dark",
                "notifications_enabled": j == 0
            },
            "last_login": datetime.now() - timedelta(days=random.randint(1, 20)),
            "status": "active",
            "created_at": datetime(2023, 7, 15 + idx, 14 + j, 0, 0),
            "updated_at": datetime.now() - timedelta(days=random.randint(1, 20)),
            "deleted": False
        }
        users_data.append(regular_user)

result = db.users.insert_many(users_data)
user_ids = result.inserted_ids
print(f"Added {len(user_ids)} tenant users")

# Create cases for each tenant
cases_data = []
case_ids = []

case_statuses = ["open", "in_progress", "closed"]
for tenant_idx, client_id in enumerate(client_ids):
    # Get users for this tenant
    tenant_users = [u for u in users_data if u.get("tenant_id") == client_id]
    if not tenant_users:
        continue
        
    # Create 3-5 cases per tenant
    num_cases = random.randint(3, 5)
    for i in range(num_cases):
        created_by = random.choice(tenant_users)["_id"]
        created_date = random_date(datetime(2023, 8, 1), datetime(2023, 10, 1))
        
        case = {
            "_id": ObjectId(),
            "tenant_id": client_id,
            "case_number": f"CASE-{tenant_idx}-{i+1:03d}",
            "title": f"Case {i+1} for Tenant {tenant_idx}",
            "description": f"This is a sample case for testing purposes for tenant {tenant_idx}.",
            "tags": ["sample", "test", f"tenant-{tenant_idx}"],
            "status": random.choice(case_statuses),
            "documents": [],
            "reports": [],
            "notes": [],
            "created_by": created_by,
            "created_at": created_date,
            "updated_at": created_date + timedelta(days=random.randint(1, 10)),
            "deleted": False
        }
        cases_data.append(case)

result = db.cases.insert_many(cases_data)
case_ids = result.inserted_ids
print(f"Added {len(case_ids)} cases")

# Create documents for each case
documents_data = []
document_ids = []

document_types = ["pdf", "image"]
for case_idx, case_id in enumerate(case_ids):
    # Find the case
    case = next(c for c in cases_data if c["_id"] == case_id)
    
    # Create 2-4 documents per case
    num_documents = random.randint(2, 4)
    for i in range(num_documents):
        created_date = case["created_at"] + timedelta(days=random.randint(1, 5))
        document_type = random.choice(document_types)
        page_count = 1 if document_type == "image" else random.randint(1, 10)
        
        document_id = ObjectId()
        document = {
            "_id": document_id,
            "tenant_id": case["tenant_id"],
            "case_id": case_id,
            "filename": f"document_{case_idx}_{i}.{'jpg' if document_type == 'image' else 'pdf'}",
            "document_type": document_type,
            "storage_paths": {
                "original": f"tenants/{case['tenant_id']}/cases/{case_id}/documents/original_{i}.{'jpg' if document_type == 'image' else 'pdf'}",
                "base_path": f"tenants/{case['tenant_id']}/cases/{case_id}/documents/doc_{i}"
            },
            "page_count": page_count,
            "ocr_status": "complete",
            "metadata": {
                "original_filename": f"sample_document_{i}.{'jpg' if document_type == 'image' else 'pdf'}",
                "description": f"Sample document {i} for case {case_idx}",
                "tags": ["sample", f"doc-{i}"]
            },
            "pages": [
                {
                    "page_number": p+1,
                    "image_path": f"tenants/{case['tenant_id']}/cases/{case_id}/documents/doc_{i}/pages/{p+1}/page.jpg",
                    "thumbnail_path": f"tenants/{case['tenant_id']}/cases/{case_id}/documents/doc_{i}/pages/{p+1}/thumbnail.jpg",
                    "text_path": f"tenants/{case['tenant_id']}/cases/{case_id}/documents/doc_{i}/pages/{p+1}/ocr.txt",
                    "ocr_data": f"Sample OCR text for document {i}, page {p+1}. This would be the extracted content."
                }
                for p in range(page_count)
            ],
            "created_by": case["created_by"],
            "created_at": created_date,
            "updated_at": created_date,
            "deleted": False
        }
        documents_data.append(document)
        
        # Add document reference to case
        case_document_ref = {
            "document_id": document_id,
            "added_at": created_date,
            "filename": document["filename"],
            "document_type": document_type,
            "page_count": page_count
        }
        case["documents"].append(case_document_ref)

if documents_data:
    result = db.documents.insert_many(documents_data)
    document_ids = result.inserted_ids
    print(f"Added {len(document_ids)} documents")
else:
    print("No documents to add")

# Update cases with document references
for case in cases_data:
    db.cases.update_one(
        {"_id": case["_id"]},
        {"$set": {"documents": case["documents"]}}
    )

# Create reports for each case
reports_data = []
report_ids = []

report_types = ["medical", "forensic", "custom"]
report_statuses = ["draft", "review", "final"]

for case_idx, case_id in enumerate(case_ids):
    # Find the case
    case = next(c for c in cases_data if c["_id"] == case_id)
    
    # Get documents for this case
    case_documents = [d for d in documents_data if d["case_id"] == case_id]
    
    # Create 1-2 reports per case
    num_reports = random.randint(1, 2)
    for i in range(num_reports):
        created_date = case["created_at"] + timedelta(days=random.randint(5, 15))
        report_type = random.choice(report_types)
        
        # Create some sample field data
        field_data = {
            "Case Number": case["case_number"],
            "Date": created_date.strftime("%Y-%m-%d"),
            "Examiner": f"Examiner {i}",
            "Subject": f"Subject {i} for case {case_idx}"
        }
        
        # Create some sample content
        content = {
            "html": f"<div class='report'><h1>Report {i} for Case {case_idx}</h1><p>This is a sample report content.</p></div>",
            "template": report_type
        }
        
        report_id = ObjectId()
        report = {
            "_id": report_id,
            "tenant_id": case["tenant_id"],
            "case_id": case_id,
            "title": f"Report {i} for Case {case_idx}",
            "report_type": report_type,
            "content": content,
            "document_ids": [d["_id"] for d in case_documents],
            "field_data": field_data,
            "status": random.choice(report_statuses),
            "versions": [],
            "analysis_results": {
                "summary": "Sample analysis summary.",
                "issues": [
                    {
                        "severity": "error",
                        "title": "Sample Error",
                        "description": "This is a sample error description.",
                        "suggestion": "This is a sample suggestion for fixing the error."
                    },
                    {
                        "severity": "warning",
                        "title": "Sample Warning",
                        "description": "This is a sample warning description.",
                        "suggestion": "This is a sample suggestion for addressing the warning."
                    }
                ],
                "recommendations": [
                    "Sample recommendation 1",
                    "Sample recommendation 2"
                ]
            },
            "created_by": case["created_by"],
            "created_at": created_date,
            "updated_at": created_date + timedelta(days=random.randint(1, 5)),
            "deleted": False
        }
        reports_data.append(report)
        
        # Add report reference to case
        case_report_ref = {
            "report_id": report_id,
            "created_at": created_date,
            "title": report["title"],
            "report_type": report_type,
            "status": report["status"]
        }
        case["reports"].append(case_report_ref)

if reports_data:
    result = db.reports.insert_many(reports_data)
    report_ids = result.inserted_ids
    print(f"Added {len(report_ids)} reports")
else:
    print("No reports to add")

# Update cases with report references
for case in cases_data:
    db.cases.update_one(
        {"_id": case["_id"]},
        {"$set": {"reports": case["reports"]}}
    )

print("\nSeed data creation complete!")
print(f"Created {len(client_ids)} clients, {len(user_ids)+1} users, {len(case_ids)} cases, {len(document_ids)} documents, and {len(report_ids)} reports.")
print("\nSample login credentials:")
print("System Admin: username='admin', password='admin123'")
print("Tenant Users: username='admin_0', 'user_0_0', etc., password='password'")