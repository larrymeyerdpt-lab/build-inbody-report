export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY to Vercel environment variables.' });
  }

  try {
    const { image, mediaType } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const contentBlock = mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: image } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: `Extract ALL data from this InBody body composition result sheet. Return ONLY a valid JSON object with no other text, no markdown, no backticks.

Use exactly these keys:
{
  "name": "",
  "age": 0,
  "sex": "Male",
  "height": "",
  "testDate": "YYYY-MM-DD",
  "weight": 0,
  "smm": 0,
  "bfm": 0,
  "pbf": 0,
  "bmi": 0,
  "lbm": 0,
  "dlm": 0,
  "visceral": 0,
  "tbw": 0,
  "ecwtbw": 0,
  "icw": 0,
  "ecw": 0,
  "bmr": 0,
  "phaseAngle": 0,
  "seg_ra_wt": 0,
  "seg_ra_pct": 0,
  "seg_la_wt": 0,
  "seg_la_pct": 0,
  "seg_tr_wt": 0,
  "seg_tr_pct": 0,
  "seg_rl_wt": 0,
  "seg_rl_pct": 0,
  "seg_ll_wt": 0,
  "seg_ll_pct": 0,
  "recMuscle": "",
  "recFat": ""
}

Rules:
- All weights in lbs. If the printout uses kg, multiply by 2.205
- sex: "Male" or "Female"
- testDate: YYYY-MM-DD format
- ecwtbw: decimal ratio like 0.371
- For segmental lean analysis: _wt is the mass in lbs, _pct is the percentage of ideal (like 104.9)
- recMuscle and recFat: the recommended change values from "Body Fat - Lean Body Mass Control" section (like "+5.0" or "-2.5")
- If a value cannot be read, use 0 for numbers or "" for strings
- Return ONLY the JSON object`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ 
        error: `Anthropic API error ${response.status}`, 
        details: errText.substring(0, 500) 
      });
    }

    const data = await response.json();
    
    // Extract text from content blocks
    let text = '';
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text' && block.text) text += block.text;
      }
    }
    
    // Clean and parse
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          const cleaned = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          parsed = JSON.parse(cleaned);
        }
      } else {
        return res.status(422).json({ error: 'Could not parse response', raw: text.substring(0, 300) });
      }
    }

    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    console.error('OCR Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
