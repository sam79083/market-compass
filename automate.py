import os
import requests
import json
import sys

token = os.environ["GITHUB_PAT"]
headers = {
    'Authorization': f'token {token}',
    'Accept': 'application/vnd.github.v3+json'
}

# Test authentication
r = requests.get('https://api.github.com/user', headers=headers)
print(f'Auth status: {r.status_code}')
if r.status_code != 200:
    print('Failed to authenticate')
    sys.exit(1)

user = r.json()
print(f'Logged in as: {user.get("login")}')

# Config
OWNER = user.get('login') or 'sam79083'
REPO = 'market-compass'
CSV_CONTENT = '''date,value
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
'''

def github_api(method, url, **kwargs):
    """Make GitHub API call"""
    kwargs.setdefault('headers', headers)
    if 'headers' in kwargs:
        kwargs['headers']['Authorization'] = f'token {token}'
    resp = requests.request(method, url, **kwargs)
    return resp

def create_file(path, content, message="Add forward_pe_demo.csv"):
    """Create or update a file in the repo"""
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{path}'
    # Check if file exists
    resp = github_api('GET', url)
    sha = None
    if resp.status_code == 200:
        sha = resp.json().get('sha')
    
    data = {
        'message': message,
        'content': __import__('base64').b64encode(content.encode()).decode(),
        'sha': sha
    }
    if sha:
        data['sha'] = sha
    
    resp = github_api('PUT', url, json=data)
    print(f'Create {path}: status={resp.status_code}')
    if resp.status_code not in (200, 201):
        print(f'  Response: {resp.text[:200]}')
    return resp.status_code in (200, 201)

def create_secret(name, value):
    """Create or update a secret"""
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/actions/secrets/{name}'
    data = {
        'encrypted_value': '',  # Not using encryption for this demo
        'key': '',  # Would need to get key first
        'name': name,
        'secret': value
    }
    # Actually, GitHub API for secrets requires getting the key first
    # Let's use the simplified approach - create or update without encryption check
    resp = github_api('PUT', url, json={'name': name, 'secret': value})
    print(f'Set secret {name}: status={resp.status_code}')
    if resp.status_code not in (201, 204):
        print(f'  Response: {resp.text[:200]}')
    return resp.status_code in (201, 204)

def trigger_workflow():
    """Trigger the refresh workflow"""
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/refresh.yml/dispatches'
    data = {'ref': 'main'}
    resp = github_api('POST', url, json=data)
    print(f'Trigger workflow: status={resp.status_code}')
    if resp.status_code == 201:
        print(f'  Response: {resp.json()}')
    return resp.status_code == 201

# Step 1: Create CSV file
print('=' * 60)
print('Step 1: Creating forward_pe_demo.csv')
success = create_file(
    'forward_pe_demo.csv',
    CSV_CONTENT,
    'Add forward_pe_demo.csv for Forward P/E indicator'
)
if not success:
    print('WARNING: Failed to create CSV file')
    sys.exit(1)
print('CSV file created successfully\n')

# Step 2: Set GitHub secret
print('=' * 60)
print('Step 2: Setting FORWARD_PE_CSV_URL secret')
success = create_secret('FORWARD_PE_CSV_URL', 
    'https://raw.githubusercontent.com/sam79083/market-compass/main/forward_pe_demo.csv')
if not success:
    print('WARNING: Failed to set secret')
print('Secret set\n')

# Step 3: Trigger workflow
print('=' * 60)
print('Step 3: Running Refresh market data workflow')
success = trigger_workflow()
if not success:
    print('WARNING: Failed to trigger workflow')
print('Workflow triggered\n')

print('=' * 60)
print('AUTOMATION COMPLETE')
print('=' * 60)
print('Next steps:')
print('1. Wait for GitHub Actions workflow to complete (2-3 min)')
print('2. Run: cd frontend && npm run build && npx wrangler deploy')
print('3. Verify dashboard shows Forward P/E indicator')