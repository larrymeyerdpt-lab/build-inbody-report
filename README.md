# BUILD InBody Report Generator

## Quick Deploy to Vercel

### 1. Push to GitHub
Create a new repo (e.g., `build-inbody-report`) and push these files:
```
build-inbody/
  api/extract.js        # Serverless OCR endpoint
  public/index.html     # Main app
  vercel.json           # Routing config
  package.json
```

### 2. Deploy on Vercel
- Go to vercel.com → New Project → Import your GitHub repo
- Framework Preset: **Other**
- Root Directory: leave as-is
- Click Deploy

### 3. Add API Key
- In Vercel dashboard → your project → Settings → Environment Variables
- Add: `ANTHROPIC_API_KEY` = your Claude API key
- Redeploy after adding the key

### 4. Use
- Open your Vercel URL on your phone
- Tap "Take Photo" → photograph an InBody printout
- AI extracts all data automatically
- Review extracted data in the form sections
- Tap "Generate Report" → full Athlete26-style report
- Print/Save as PDF

## How It Works
- **Frontend** (public/index.html): Camera capture, image compression, form, report generation
- **Backend** (api/extract.js): Receives base64 image, calls Claude API with API key, returns structured JSON
- Images are compressed to 1200px wide / 75% JPEG quality before upload
- All report narratives use BUILD's analogy-rich style (building, plumbing, engine, bank account)

## Fallback
If OCR fails, a "Paste JSON" field appears. You can ask Claude in a chat to extract data from the photo and paste the resulting JSON directly.
