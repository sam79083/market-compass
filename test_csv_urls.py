import requests

# Test potential CSV URLs
test_urls = [
    # S&P 500 from datasets
    'https://raw.githubusercontent.com/datasets/s-and-p-500/main/data.csv',
    # Try the ListBase S&P 500 data
    'https://raw.githubusercontent.com/datasets/s-and-p-500/master/data.csv',
    # Try treasury rates
    'https://raw.githubusercontent.com/datasets/us-treasury-rates/main/data.csv',
]

for url in test_urls:
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            # Check columns
            lines = r.text.strip().split('\n')[:3]
            print(f'OK: {url}')
            print(f'  Headers: {lines}')
        else:
            print(f'FAIL: {url} - status {r.status_code}')
    except Exception as e:
        print(f'ERROR: {url} - {e}')

# Also test the fear-greed CSV to confirm it works
print()
print('Testing fear-greed CSV (reference):')
try:
    r = requests.get('https://raw.githubusercontent.com/whit3rabbit/fear-greed-data/main/fear-greed.csv', timeout=10)
    print(f'Status: {r.status_code}')
    print(f'Headers: {r.text[:100]}')
    print(f'First line: {r.text.strip().split(chr(10))[0]}')
except Exception as e:
    print(f'Error: {e}')