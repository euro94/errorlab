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

const SYSTEM_PROMPT = `You are an OCR and accounting question extractor. You receive a photo of a Becker CPA review question (FAR section). Extract the following and return ONLY valid JSON with these exact keys:

{
  "question": "The full question stem exactly as shown",
  "correctAnswer": "The correct answer choice (letter + text)",
  "yourAnswer": "The answer the student selected / is marked (the wrong one)",
  "topic": "The accounting topic (e.g. Bonds, Leases, Consolidation, NFP, Revenue Recognition, etc.)"
}

Rules:
- If you can't read something clearly, use "[unreadable]"
- If there's no clearly marked wrong answer, set yourAnswer to "[not visible]"
- Return ONLY the JSON object, no markdown, no explanation`;

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
      question: parsed.question || '',
      correctAnswer: parsed.correctAnswer || '',
      yourAnswer: parsed.yourAnswer || '',
      topic: parsed.topic || ''
    };
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        question: parsed.question || '',
        correctAnswer: parsed.correctAnswer || '',
        yourAnswer: parsed.yourAnswer || '',
        topic: parsed.topic || ''
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
