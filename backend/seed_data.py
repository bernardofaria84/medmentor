"""
Seed database with sample data for testing
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path
from datetime import datetime
import uuid
from auth_utils import hash_password

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'medmentor_db')]

async def seed_mentors():
    """Create sample mentors"""
    
    mentors_data = [
        {
            "_id": str(uuid.uuid4()),
            "email": "dr.cardiology@medmentor.com",
            "password_hash": hash_password("password123"),
            "full_name": "Dr. Maria Silva",
            "specialty": "Cardiology",
            "bio": "Renowned cardiologist with over 20 years of experience. Specializes in interventional cardiology and heart failure management.",
            "avatar_url": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": str(uuid.uuid4()),
            "email": "dr.neurology@medmentor.com",
            "password_hash": hash_password("password123"),
            "full_name": "Dr. João Santos",
            "specialty": "Neurology",
            "bio": "Expert neurologist focusing on neurodegenerative diseases and stroke treatment. Published over 50 research papers.",
            "avatar_url": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": str(uuid.uuid4()),
            "email": "dr.pediatrics@medmentor.com",
            "password_hash": hash_password("password123"),
            "full_name": "Dr. Ana Costa",
            "specialty": "Pediatrics",
            "bio": "Dedicated pediatrician with expertise in childhood development and infectious diseases. Passionate about preventive care.",
            "avatar_url": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Check if mentors already exist
    existing_count = await db.mentors.count_documents({})
    if existing_count > 0:
        print(f"Database already has {existing_count} mentors. Skipping seed.")
        return mentors_data
    
    # Insert mentors
    await db.mentors.insert_many(mentors_data)
    print(f"✅ Seeded {len(mentors_data)} mentors")
    
    return mentors_data

async def seed_sample_user():
    """Create a sample user"""
    
    user_data = {
        "_id": str(uuid.uuid4()),
        "email": "doctor@example.com",
        "password_hash": hash_password("password123"),
        "full_name": "Dr. Test User",
        "crm": "CRM-12345",
        "specialty": "General Medicine",
        "profile_picture_url": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        print(f"Test user already exists. Skipping.")
        return existing_user
    
    await db.users.insert_one(user_data)
    print(f"✅ Seeded test user: {user_data['email']}")
    
    return user_data

async def create_sample_content(mentor_id: str, mentor_name: str):
    """Create sample content for a mentor"""
    
    sample_texts = {
        "Dr. Maria Silva": """
# Cardiology Best Practices Guide

## Chapter 1: Heart Failure Management

Heart failure is a complex clinical syndrome that requires comprehensive management. 
The key principles include:

1. **Early Diagnosis**: Recognize symptoms early including dyspnea, fatigue, and edema
2. **Medication Optimization**: Use evidence-based therapies including ACE inhibitors, beta-blockers, and diuretics
3. **Lifestyle Modifications**: Encourage sodium restriction, fluid management, and regular exercise
4. **Patient Education**: Ensure patients understand their condition and medication regimen

## Chapter 2: Acute Coronary Syndrome

Acute coronary syndrome (ACS) requires immediate intervention. Key points:

- Recognize symptoms: chest pain, radiation to arm or jaw, dyspnea
- Immediate ECG is critical
- Administer aspirin immediately
- Consider thrombolysis or PCI based on STEMI vs NSTEMI presentation
- Risk stratification using GRACE or TIMI scores

## Chapter 3: Hypertension Control

Blood pressure control is fundamental to cardiovascular health:

- Target BP: <130/80 mmHg for most patients
- First-line agents: ACE inhibitors, ARBs, thiazides, calcium channel blockers
- Combination therapy often required
- Monitor for end-organ damage regularly
""",
        "Dr. João Santos": """
# Neurology Clinical Guidelines

## Chapter 1: Stroke Management

Stroke is a neurological emergency requiring immediate action:

1. **Time is Brain**: Every minute counts in acute stroke
2. **FAST Assessment**: Face drooping, Arm weakness, Speech difficulties, Time to call emergency
3. **Imaging**: CT or MRI to differentiate ischemic from hemorrhagic stroke
4. **Thrombolysis**: Consider IV tPA within 4.5 hours for ischemic stroke
5. **Thrombectomy**: Mechanical intervention for large vessel occlusion

## Chapter 2: Alzheimer's Disease

Progressive neurodegenerative disorder affecting memory and cognition:

- Early symptoms: Memory loss, confusion, difficulty with familiar tasks
- Diagnosis: Clinical assessment, cognitive testing, neuroimaging
- Treatment: Cholinesterase inhibitors (donepezil, rivastigmine)
- Memantine for moderate to severe disease
- Non-pharmacological: Cognitive stimulation, structured routines

## Chapter 3: Parkinson's Disease

Movement disorder characterized by tremor, rigidity, and bradykinesia:

- Cardinal symptoms: Resting tremor, rigidity, bradykinesia, postural instability
- Treatment: Levodopa remains gold standard
- Adjunct therapies: DA agonists, MAO-B inhibitors, COMT inhibitors
- Deep brain stimulation for advanced disease
""",
        "Dr. Ana Costa": """
# Pediatric Medicine Handbook

## Chapter 1: Well-Child Visits

Regular well-child visits are essential for monitoring growth and development:

1. **Growth Parameters**: Track height, weight, head circumference
2. **Developmental Milestones**: Assess gross motor, fine motor, language, social skills
3. **Immunizations**: Follow recommended vaccination schedule
4. **Anticipatory Guidance**: Nutrition, safety, sleep, behavior

## Chapter 2: Common Pediatric Infections

Children are susceptible to various infections:

- **Upper Respiratory Infections**: Most common, usually viral, supportive care
- **Otitis Media**: Bacterial infection, consider antibiotics based on age and severity
- **Streptococcal Pharyngitis**: Rapid strep test, treat with penicillin or amoxicillin
- **Gastroenteritis**: Maintain hydration, oral rehydration solutions

## Chapter 3: Asthma in Children

Chronic inflammatory airway disease requiring long-term management:

- Symptoms: Wheezing, cough, dyspnea, chest tightness
- Triggers: Allergens, exercise, viral infections, air pollution
- Treatment: Stepwise approach based on severity
- Controller: Inhaled corticosteroids
- Reliever: Short-acting beta-agonists (albuterol)
- Action plan: Written asthma action plan for parents
"""
    }
    
    content_text = sample_texts.get(mentor_name, "")
    if not content_text:
        return
    
    content_id = str(uuid.uuid4())
    content_doc = {
        "_id": content_id,
        "mentor_id": mentor_id,
        "title": f"{mentor_name}'s Clinical Guide",
        "content_type": "TEXT",
        "status": "COMPLETED",
        "original_file_url": None,
        "processed_text": content_text,
        "uploaded_at": datetime.utcnow()
    }
    
    await db.mentor_content.insert_one(content_doc)
    print(f"✅ Created sample content for {mentor_name}")
    
    # Create chunks with embeddings (simplified - using zero vectors for MVP seed)
    # In production, these would be real embeddings from OpenAI
    from rag_service import rag_service
    
    chunks = rag_service.chunk_text(content_text)
    print(f"   Processing {len(chunks)} chunks...")
    
    for i, chunk_text in enumerate(chunks[:5]):  # Limit to 5 chunks for seeding speed
        try:
            # Generate actual embedding
            embedding = await rag_service.generate_embedding(chunk_text)
            
            chunk_doc = {
                "content_id": content_id,
                "mentor_id": mentor_id,
                "title": content_doc["title"],
                "chunk_index": i,
                "text": chunk_text,
                "embedding": embedding,
                "created_at": datetime.utcnow()
            }
            
            await db.content_chunks.insert_one(chunk_doc)
        except Exception as e:
            print(f"   Warning: Could not generate embedding for chunk {i}: {e}")
            continue
    
    print(f"   ✅ Processed 5 chunks with embeddings")

async def main():
    """Main seeding function"""
    print("🌱 Starting database seed...")
    print("="*50)
    
    # Seed mentors
    mentors = await seed_mentors()
    
    # Seed sample user
    user = await seed_sample_user()
    
    # Create sample content for each mentor
    print("\n📚 Creating sample content...")
    for mentor in mentors:
        await create_sample_content(mentor["_id"], mentor["full_name"])
    
    print("\n"+"="*50)
    print("✅ Database seeding completed!")
    print("\n📝 Test Credentials:")
    print("="*50)
    print("Medical Subscribers:")
    print("  Email: doctor@example.com")
    print("  Password: password123")
    print("\nMentors:")
    print("  Email: dr.cardiology@medmentor.com")
    print("  Password: password123")
    print("\n  Email: dr.neurology@medmentor.com")
    print("  Password: password123")
    print("\n  Email: dr.pediatrics@medmentor.com")
    print("  Password: password123")
    print("="*50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
