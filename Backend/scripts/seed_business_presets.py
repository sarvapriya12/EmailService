import os
import sys
import logging

# Ensure we can import from the root directory when running this as a script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database import _get_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PRESETS = [
    {
        "type_key": "clothing",
        "name": "Clothing & Products",
        "categories": ["shipping", "returns", "product_availability", "sizing", "general_inquiry"],
        "extraction_fields": ["customer_name", "order_number", "product_name", "issue", "priority"],
        "default_tone": "warm",
        "default_style": "empathetic"
    },
    {
        "type_key": "food",
        "name": "Food & Cafe",
        "categories": ["reservation", "menu", "delivery_issue", "complaint", "general_inquiry"],
        "extraction_fields": ["customer_name", "order_number", "reservation_time", "issue", "priority"],
        "default_tone": "friendly",
        "default_style": "apologetic"
    },
    {
        "type_key": "freelancer",
        "name": "Freelancer / Services",
        "categories": ["new_lead", "project_status", "billing", "revision_request", "general_inquiry"],
        "extraction_fields": ["client_name", "project_name", "budget", "timeline", "priority"],
        "default_tone": "professional",
        "default_style": "solution-first"
    },
    {
        "type_key": "digital",
        "name": "Digital Products",
        "categories": ["download_issue", "license_key", "refund", "technical_support", "general_inquiry"],
        "extraction_fields": ["customer_name", "order_number", "license_key", "issue", "priority"],
        "default_tone": "professional",
        "default_style": "concise"
    },
    {
        "type_key": "coaching",
        "name": "Coaching / Education",
        "categories": ["scheduling", "course_access", "billing", "coaching_question", "general_inquiry"],
        "extraction_fields": ["student_name", "course_name", "module_name", "issue", "priority"],
        "default_tone": "enthusiastic",
        "default_style": "detailed"
    },
    {
        "type_key": "general",
        "name": "General (Default)",
        "categories": ["billing", "refund", "technical_support", "complaint", "feature_request", "general_inquiry"],
        "extraction_fields": ["customer_name", "issue", "priority", "reference_number", "product_name"],
        "default_tone": "friendly",
        "default_style": "concise"
    }
]

def seed_presets():
    """Seeds system-defined business presets into the Supabase database."""
    logger.info("Starting to seed business presets...")
    
    try:
        supabase = _get_client()
        
        for preset in PRESETS:
            type_key = preset["type_key"]
            
            # Check if preset already exists
            existing = supabase.table("business_profile_presets").select("id").eq("type_key", type_key).execute()
            
            if existing.data:
                # Update if exists
                supabase.table("business_profile_presets").update(preset).eq("type_key", type_key).execute()
                logger.info("Updated existing preset: %s", type_key)
            else:
                # Insert if not exists
                supabase.table("business_profile_presets").insert(preset).execute()
                logger.info("Inserted new preset: %s", type_key)
                
        logger.info("Successfully seeded all business presets!")
        
    except Exception as exc:
        logger.error("Failed to seed business presets: %s", exc)
        sys.exit(1)

if __name__ == "__main__":
    seed_presets()