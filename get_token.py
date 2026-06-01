from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
]


#to be used if any error in future with refresh token, to generate new refresh token using client id and client secret
# SCOPES = [
#     "https://www.googleapis.com/auth/gmail.modify",
#     "https://www.googleapis.com/auth/gmail.send",
#     "https://www.googleapis.com/auth/gmail.readonly",
# ]

flow = InstalledAppFlow.from_client_secrets_file(
    "credentials.json",
    scopes=SCOPES
)

creds = flow.run_local_server(port=8080)

print("REFRESH TOKEN:", creds.refresh_token)