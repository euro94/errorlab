/* ErrorLab — openai.js: GPT-4o-mini vision extraction for Becker questions */

function getApiKey() {
  try {
    const raw = localStorage.getItem('errorlab_v1');
    if (raw) {
      const s = JSON.parse(raw);
      return (s.settings && s.settings.apiKey) || '';
    }
  } catch (e) {}
  return '';
}

export function hasApiKey() {
  return getApiKey().length > 0;
}

export function setApiKey(key) {
  try {
    const raw = localStorage.getItem('errorlab_v1');
    const s = raw ? JSON.parse(raw) : { entries: [], settings: {} };
    s.settings = s.settings || {};
    s.settings.apiKey = key;
    localStorage.setItem('errorlab_v1', JSON.stringify(s));
    return true;
  } catch (e) {
    return false;
  }
}

const SYSTEM_PROMPT = `You are an OCR and accounting question extractor for CPA FAR exam prep. You receive a photo of a Becker question the student got wrong. Extract this JSON:

{
  "question": "Full question stem",
  "correctAnswer": "Correct answer (letter + text)",
  "yourAnswer": "Student's wrong answer",
  "topic": "Topic (e.g. Bond amortization, Lease classification)",
  "outcome": "Guess: 'mastered', 'fragile', 'honest_gap', or 'misconception'. Default 'honest_gap'.",
  "failureReason": "Guess: 'conceptual', 'application', 'computational', 'misread', 'trap', 'pacing', 'incomplete', or 'stale'. Default 'conceptual'.",
  "skillLevel": "AICPA level: 'remembering', 'application', or 'analysis'",
  "farNode": "CPA FAR content area key from this list — pick closest match:\nconceptual_framework, going_concern, ratios_fsa, balance_sheet, income_statement, oci, statement_equity, cash_flows, notes_disclosures, segment_reporting, interim_reporting, nfp_reporting, special_purpose, sec_reporting, slg_measurement, slg_fund_types, slg_fund_fs, slg_gw_fs, slg_reconciliation, slg_budgetary, slg_net_position, slg_mda_rsi, cash, receivables, inventory_costing, inventory_valuation, ppe_capitalize, ppe_depreciation, ppe_impairment, investments_debt, investments_equity, intangibles, goodwill, payables, debt_bonds, debt_modification, equity_stock, equity_treasury, equity_dividends, revenue_606, leases_lessee, leases_lessor, income_taxes, business_combos, consolidations, acct_changes, contingencies, fair_value, fx, nonmonetary, subsequent_events, stock_comp, pensions, derivatives, software_rd, nfp_transactions",
  "errorNote": "One-line diagnosis"
}

Rules: return ONLY valid JSON, no markdown. Use "[unreadable]" for unreadable fields.`;

export async function extractFromPhoto(base64Image) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key set. Go to Settings to add your OpenAI key.');
  }

  // Compress image if too large (max ~20MB API limit, we target ~2MB)
  const compressed = await compressImage(base64Image);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: compressed,
                detail: 'high'
              }
            },
            {
              type: 'text',
              text: 'Extract the question, correct answer, selected (wrong) answer, and topic from this Becker FAR question photo.'
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key. Check your key in Settings.');
    if (response.status === 429) throw new Error('Rate limited. Wait a moment and try again.');
    throw new Error(`OpenAI error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  // Parse the JSON from the response
  try {
    // Try direct parse first
    const parsed = JSON.parse(content);
    return {
      return {
        question: parsed.question || '',
        correctAnswer: parsed.correctAnswer || '',
        yourAnswer: parsed.yourAnswer || '',
        topic: parsed.topic || '',
        outcome: parsed.outcome || 'honest_gap',
        failureReason: parsed.failureReason || 'conceptual',
        skillLevel: parsed.skillLevel || 'application',
        farNode: parsed.farNode || 'select_transactions',
        farSubNode: parsed.farSubNode || '',
        errorNote: parsed.errorNote || ''
      };
      } catch (e) {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          question: parsed.question || '',
          correctAnswer: parsed.correctAnswer || '',
          yourAnswer: parsed.yourAnswer || '',
          topic: parsed.topic || '',
          outcome: parsed.outcome || 'honest_gap',
          failureReason: parsed.failureReason || 'conceptual',
          skillLevel: parsed.skillLevel || 'application',
          farNode: parsed.farNode || 'select_transactions',
          farSubNode: parsed.farSubNode || '',
          errorNote: parsed.errorNote || ''
        };
      }
    throw new Error('Could not parse AI response. Try again with a clearer photo.');
  }
}

// Compress image to reduce API latency and cost
async function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
}
