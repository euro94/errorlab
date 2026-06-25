/* ErrorLab — views/log.js: simple working baseline */
import { addEntry } from '../store.js';

let section = '', mod = '';

export function renderLog() {
  const w = document.createElement('div');
  w.className = 'fade-in';
  w.innerHTML = `<div class="section-head">Fast Log</div>
    <div class="card-sm" style="margin-bottom:var(--s3)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
      <input class="input input-sm" id="sec" placeholder="Section (FAR)" style="font-size:16px"/>
      <input class="input input-sm" id="mod" placeholder="Module (F3: Bonds)" style="font-size:16px"/>
    </div></div>
    <div class="capture-zone" id="cz"><div class="capture-inner">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      <span style="font-weight:700;color:var(--primary);margin-top:var(--s2)">Tap to capture</span>
    </div><input type="file" accept="image/*" capture="environment" id="pi" hidden/></div>
    <div id="result" style="margin-top:var(--s3)"></div>`;

  const cz = w.querySelector('#cz');
  const pi = w.querySelector('#pi');
  const result = w.querySelector('#result');
  const secEl = w.querySelector('#sec');
  const modEl = w.querySelector('#mod');

  secEl.oninput = () => { section = secEl.value; };
  modEl.oninput = () => { mod = modEl.value; };
  cz.onclick = () => pi.click();

  pi.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    result.innerHTML = '<div class="card" style="text-align:center;padding:var(--s5)"><div class="spinner"></div><p>Reading...</p></div>';
    try {
      const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = ev => r(ev.target.result); rd.readAsDataURL(f); });
      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 })
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const d = await resp.json();
      addEntry({
        section, module: mod,
        question: d.question || '',
        yourAnswer: d.yourAnswer || '',
        correctAnswer: d.correctAnswer || '',
        outcome: d.outcome || 'honest_gap',
        failureReason: d.failureReason || 'conceptual',
        skillLevel: d.skillLevel || 'application',
        farNode: d.farNode || '',
        farSubNode: d.farSubNode || '',
        confidence: 3
      });
      result.innerHTML = `<div class="card" style="border-color:var(--success);background:var(--success-soft);padding:var(--s3)"><span style="color:var(--success)">✓</span> <strong>${d.question?.slice(0,60)||'Saved'}...</strong><br><small style="color:var(--muted)">${d.yourAnswer||''} → ${d.correctAnswer||''}</small></div>`;
      pi.value = '';
    } catch (err) {
      result.innerHTML = `<div class="card" style="border-color:var(--danger)"><span style="color:var(--danger)">⚠ ${err.message}</span></div>`;
    }
  };

  return w;
}
