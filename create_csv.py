import os
import requests
import json
import base64

token = os.environ["GITHUB_PAT"]
headers = {'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json'}

OWNER = 'sam79083'
REPO = 'market-compass'
PATH = 'forward_pe_demo.csv'

# CSV content
content = """date,value
2023-01-01,18.5
2023-02-01,18.3
2023-03-01,17.9
2023-04-01,18.1
2023-05-01,18.4
2023-06-01,18.7
2023-07-01,19.0
2023-08-01,18.8
2023-09-01,18.5
2023-10-01,18.2
2023-11-01,18.6
2023-12-01,18.9
2024-01-01,19.2
2024-02-01,19.0
2024-03-01,18.7
2024-04-01,18.5
2024-05-01,18.9
2024-06-01,19.1
2024-07-01,19.4
2024-08-01,19.2
2024-09-01,18.9
2024-10-01,18.7
2024-11-01,19.0
2024-12-01,19.3
2025-01-01,19.5
2025-02-01,19.3
2025-03-01,19.1
2025-04-01,19.4
2025-05-01,19.7
2025-06-01,19.9
2025-07-01,20.1
2025-08-01,20.3
2025-09-01,20.0
2025-10-01,19.8
2025-11-01,20.2
2025-12-01,20.5
"""

# Encode content
encoded = base64.b64encode(content.encode()).decode()

# Check if file exists
url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{PATH}'
resp = requests.get(url, headers=headers)
print(f'Check file status: {resp.status_code}')

sha = None
if resp.status_code == 200:
    sha = resp.json().get('sha')
    print(f'File exists, SHA: {sha[:8]}...')

# Create or update file
data = {
    'message': 'Add forward_pe_demo.csv for Forward P/E indicator',
    'content': encoded,
}
if sha:
    data['sha'] = sha

put_resp = requests.put(url, headers=headers, json=data)
print(f'Create/Update status: {put_resp.status_code}')

if put_resp.status_code in (200, 201):
    result = put_resp.json()
    print(f'File: {result.get("content", {}).get("url", "N/A")}')
    print(f'Commit: {result.get("commit", {}).get("url", "N/A")}')
    print('SUCCESS: CSV file created/updated')
else:
    print(f'ERROR: {put_resp.text[:300]}')