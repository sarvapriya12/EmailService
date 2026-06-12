import os
import sys

# Add backend directory to sys.path so we can import services
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from services.database import _get_client

def test():
    print("Initializing Supabase client...")
    client = _get_client()
    print("Client initialized successfully.")
    
    print("\nFetching data from 'email_filters' table...")
    try:
        res = client.table("email_filters").select("*").limit(5).execute()
        print("Success! Data retrieved:")
        print(res.data)
    except Exception as e:
        print("Error fetching 'email_filters':", e)

if __name__ == "__main__":
    test()
