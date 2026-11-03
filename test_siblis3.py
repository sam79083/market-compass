import requests
import json
import sys

# Try different ticker symbols for free tier
tickers_to_try = [
    'SPX',
    '%5EGSPC', 
    'US-LARGE-CAP',
    'US-LARGE',
    'S&P500',
]

for ticker in tickers_to_try:
    print(f"\nTrying ticker: {ticker}")
    try:
        r = requests.get(
            f'https://siblisresearch.supabase.co/functions/v1/free-data-api/v1/{ticker}/pe-forward',
            timeout=10
        )
        print(f'  Status: {r.status_code}')
        data = r.json()
        print(f'  Keys: {list(data.keys())[:5]}')
        if 'error' not in data:
            print(f'  SUCCESS! First entry: {json.dumps(data[:1], indent=2) if isinstance(data, list) else str(data)[:200]}')
        else:
            print(f'  Error: {data.get("error")}')
    except Exception as e:
        print(f'  Exception: {e}')