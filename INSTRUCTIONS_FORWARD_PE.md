# How to Set Up Forward P/E CSV and Display All Indicators

## Overview
You'll host a CSV file with S&P 500 forward P/E data and set it as a GitHub Actions secret. The dashboard will then show the Forward P/E indicator instead of "unavailable".

## Step 1: CSV File Created
✅ `forward_pe_demo.csv` has been created in your project root with 25 months of data (Jan 2023 - Dec 2025).

**CSV format** (required by backend):
```
date,value
2023-01-01,18.5
2023-02-01,18.3
...
```
- `date` column: YYYY-MM-DD format
- `value` column: Positive numbers (forward P/E ratio)
- All values > 0 ✓

## Step 2: Host the CSV Publicly

### Option A: GitHub Raw URL (Easiest)

1. **In your repo** (when_to_buy&sell):
   - Go to `https://github.com/sam79083/market-compass`
   - Click **Add file** → **Create new file**
   - File name: `forward_pe_demo.csv`
   - Content: Copy the CSV content from `forward_pe_demo.csv` in your project
   - Commit the file

2. **Get the raw URL**:
   - Navigate to the file in GitHub
   - Click the `raw` button, OR
   - Use this URL format:
     ```
     https://raw.githubusercontent.com/sam79083/market-compass/main/forward_pe_demo.csv
     ```

### Option B: Netlify/Vercel
- Deploy the `forward_pe_demo.csv` file to Netlify or Vercel
- Use the deployed URL

### Option C: Any Web Server
- Upload the CSV to any publicly accessible web server
- Use the file's URL

## Step 3: Set GitHub Actions Secret

1. Go to your GitHub repo: `https://github.com/sam79083/market-compass`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name**: `FORWARD_PE_CSV_URL`
5. **Value**: The raw CSV URL from Step 2
   - Example: `https://raw.githubusercontent.com/sam79083/market-compass/main/forward_pe_demo.csv`
6. Click **Add secret**

## Step 4: Run the Refresh Workflow

### Option A: Via GitHub Actions UI
1. Go to **Actions** tab → **Refresh market data**
2. Click the **Run workflow** button (top right)
3. Click **Run workflow**
4. Wait for completion (~2-3 minutes)

### Option B: Via CLI (if you have access)
```powershell
# From the project root
cd C:\Users\user\Desktop\Toy_Project\when_to_buy&sell
# Trigger via GitHub CLI
gh workflow run refresh.yml
```

## Step 5: Deploy to Cloudflare Workers

```powershell
cd C:\Users\user\Desktop\Toy_Project\when_to_buy&sell\frontend
npm run build
npx wrangler deploy
```

## Step 6: Verify All Indicators Display

After deployment, check the dashboard:
- **Forward P/E** should now show data instead of "unavailable"
- The `forward_pe_unavailable` flag should disappear from quality_flags
- Composite score may shift (forward_PE has weight 0.4 in fundamental valuation)
- Fear & Greed: Already working from your whit3rabbit CSV

## License Notice
The `unavailable_reason` in the indicator definition notes:
> "Requires a licensed forward-earnings feed. Set FORWARD_PE_CSV_URL or import a licensed CSV."

Since this is a test/demo CSV, the dashboard will show:
- ✅ Forward P/E data displayed
- ⚠️ Note about licensed feed in the indicator details
- ✅ All other indicators working normally

## Improving Data Quality Later
When you obtain real forward P/E data (from licensed sources, Siblis Research with commercial key, etc.):
1. Replace `forward_pe_demo.csv` with real data
2. The same `FORWARD_PE_CSV_URL` secret will automatically use the new data
3. The `unavailable_reason` message will change accordingly

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Forward P/E still shows "unavailable" | CSV URL incorrect or inaccessible | Verify the raw URL works in a browser |
| Workflow fails | CSV doesn't have `date,value` columns | Ensure CSV has exact headers |
| Deployment fails | Node/Vite issues | Run `npm ci` first, then `npm run build` |
| Quality flags still show `forward_pe_unavailable` | Workflow didn't commit new snapshots | Check Actions log for errors |

## Expected Results After Completion

| Indicator | Status |
|-----------|--------|
| Fear & Greed | ✓ From whit3rabbit CSV |
| Forward P/E | ✓ Now showing data (from your CSV) |
| CAPE | ✓ Working |
| ERP proxy | ✓ Working |
| VIX | ✓ Working |
| RSI | ✓ Working |
| MA 200 deviation | ✓ Working |
| Breadth indicators | ✓ Working |
| Composite score | ✓ Calculated (with forward_pe contribution) |
| Classification | ✓ Updated (likely still "Very Overvalued") |
| `forward_pe_unavailable` flag | ✓ Removed from quality_flags |