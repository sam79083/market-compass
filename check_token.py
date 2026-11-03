import os
import requests
import json
import sys

token = os.environ["GITHUB_PAT"]
headers = {'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json'}

# Check token authorizations
r = requests.get('https://api.github.com/authorizations', headers=headers)
print('Authorizations status:', r.status_code)
if r.status_code == 200:
    for auth in r.json():
        scopes = auth.get('scopes', [])
        note = auth.get('note', '')[:50]
        print(f'  Token ID: {auth.get("id")} - Scopes: {scopes} - Note: {note}')

# Try to access the repo
r2 = requests.get('https://api.github.com/repos/sam79083/market-compass', headers=headers)
print(f'\nRepo access: {r2.status_code}')
if r2.status_code == 403:
    print('Access denied - check token permissions')
    print(f'Response: {r2.text[:300]}')
elif r2.status_code == 200:
    print('Repo accessible')
    repo_data = r2.json()
    print(f'Repo name: {repo_data.get("name")}')
    print(f'Repo private: {repo_data.get("private")}')