import requests
import json
import sys

print("Fetching free-tier indices list...")
try:
    r = requests.get(
        'https://siblisresearch.supabase.co/functions/v1/free-data-api/v1/indices',
        timeout=10
    )
    print(f'Status: {r.status_code}')
    data = r.json()
    print(f'Type: {type(data).__name__}')
    print(f'Length: {len(data) if isinstance(data, list) else "N/A"}')
    
    if isinstance(data, list):
        print(f'\nFree-tier tickers ({len(data)} total):')
        for i, entry in enumerate(data):
            print(f'  {i+1}. {json.dumps(entry)[:100]}')
        # Try pe-forward on first few
        print('\nTesting pe-forward on first 3 tickers:')
        for entry in data[:3]:
            t = entry.get('ticker', '') if isinstance(entry, dict) else str(entry)[:50]
            print(f'  Testing {t}...')
            try:
                r2 = requests.get(
                    f'https://siblisresearch.supabase.co/functions/v1/free-data-api/v1/{t}/pe-forward',
                    timeout=10
                )
                d = r2.json()
                if 'error' not in d:
                    print(f'    SUCCESS! Count: {len(d)}')
                    print(f'    First: {d[0] if isinstance(d, list) else d}')
                else:
                    print(f'    Error: {d.get("error")}')
            except Exception as e:
                print(f'    Exception: {e}')
    else:
        print(f'Keys: {list(data.keys())[:10]}')
        for k in list(data.keys())[:5]:
            v = data[k]
            if isinstance(v, (list, dict)):
                print(f'  {k}: {type(v).__name__} ({len(v)} items)')
            else:
                print(f'  {k}: {v}')
                
sys.exit(0)
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)