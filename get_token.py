from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

flow = InstalledAppFlow.from_client_secrets_file(
    "credentials.json",
    scopes=SCOPES
)

creds = flow.run_local_server(port=8080)

print("REFRESH TOKEN:", creds.refresh_token)