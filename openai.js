/* ErrorLab — openai.js: calls local server proxy (no API key needed on client) */
export function hasApiKey() { return true; } // key stored server-side, always available
export function setApiKey(key) { return true; } // no-op, key is server-side

export async function extractFromPhoto(base64Image) {
  // Compress image
  const compressed = await new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = base64Image;
  });

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: compressed })
  });

  if (!response.ok) {
    if (response.status === 503) throw new Error('Server missing API key. Check .openai_key file.');
    const text = await response.text();
    throw new Error(`Server error: ${response.status} — ${text.slice(0, 100)}`);
  }

  const data = await response.json();
  return {
    question: data.question || '',
    correctAnswer: data.correctAnswer || '',
    yourAnswer: data.yourAnswer || '',
    topic: data.topic || '',
    outcome: data.outcome || 'honest_gap',
    failureReason: data.failureReason || 'conceptual',
    skillLevel: data.skillLevel || 'application',
    farNode: data.farNode || '',
    farSubNode: data.farSubNode || '',
    errorNote: data.errorNote || ''
  };
}
