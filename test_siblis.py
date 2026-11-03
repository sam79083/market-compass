import requests
import json
import sys

try:
    r = requests.get(
        'https://siblisresearch.supabase.co/functions/v1/free-data-api/v1/US-LARGE-CAP/pe-forward',
        timeout=10
    )
    print('Status:', r.status_code)
    print('Content-type:', r.headers.get('content-type'))
    data = r.json()
    print('Type:', type(data))
    if isinstance(data, list):
        print('Length:', len(data))
        print('First 3 entries:')
        for entry in data[:3]:
            print('  ', entry)
    elif isinstance(data, dict):
        print('Keys:', list(data.keys())[:10])
        for k in list(data.keys())[:5]:
            val = data[k]
            if isinstance(val, (list, dict)):
                print(f'  {k}: {type(val).__name__} with {len(val) if hasattr(val, "__len__") else "???"} items')
            else:
                print(f'  {k}: {val}')
    sys.exit(0)
except Exception as e:
    print('Error:', e, file=sys.stderr)
    sys.exit(1)