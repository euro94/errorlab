/* ErrorLab — views/log.js: camera + AI extraction + 6-axis rapid button matrix */
import { addEntry, OUTCOMES, FAILURE_REASONS, SKILL_LEVELS, FAR_NODES } from '../store.js';
import { extractFromPhoto, hasApiKey, setApiKey } from '../openai.js';

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function att(s) { return esc(s).replace(/"/g, '&quot;'); }

let stickySection = '';
let stickyModule = '';
let photo = null;
let data = null;       // AI results
// User's rapid-fire selections (pre-filled from AI)
let picks = { outcome: 'honest_gap', failure: 'conceptual', skill: 'application', farNode: 'select_transactions', farSub: '', confidence: 3, time: 0, firstExposure: false };
let busy = false;
let err = null;
let saved = null;

export function renderLog() {
  const w = document.createElement('div');
  w.className = 'fade-in';

  function r() {
    if (!hasApiKey()) {
      w.innerHTML = `<div class="section-head">Fast Log</div><div class="card state"><div class="big">🔑</div><h2>API Key</h2><input class="input" id="ki" type="password" placeholder="sk-..." style="max-width:280px;display:block;margin:0 auto var(--s3)"/><button class="btn primary" id="ks">Save Key</button></div>`;
      w.querySelector('#ks').onclick = () => { const v = w.querySelector('#ki').value.trim(); if (v && v.startsWith('sk-')) { setApiKey(v); r(); } };
      return;
    }
    const store = window.__errorlabGetStore ? window.__errorlabGetStore() : { entries: [] };
    const today = store.entries.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).length;
    const due = store.entries.filter(e => e.fsrs && new Date(e.fsrs.due) <= new Date()).length;

    let h = `<div class="section-head">Fast Log</div>
      <div class="card-sm" style="margin-bottom:var(--s3)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
          <div class="field" style="margin:0"><label style="font-size:var(--t-xs)">Section</label><input class="input input-sm" id="sec" placeholder="FAR" value="${att(stickySection)}"/></div>
          <div class="field" style="margin:0"><label style="font-size:var(--t-xs)">Module</label><input class="input input-sm" id="mod" placeholder="F3: Bonds" value="${att(stickyModule)}"/></div>
        </div>
      </div>`;

    if (!photo) {
      h += `<div class="capture-zone" id="cz"><div class="capture-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-weight:700;color:var(--primary);margin-top:var(--s2)">Tap to capture</span></div><input type="file" accept="image/*" capture="environment" id="pi" hidden/></div>`;
    }

    if (busy) h += `<div class="card state" style="margin-top:var(--s3)"><div class="spinner"></div><h2>AI reading...</h2></div>`;
    if (err) h += `<div class="card" style="margin-top:var(--s3);border-color:var(--danger)"><div style="display:flex;gap:var(--s2)"><span style="color:var(--danger);font-size:var(--t-xl)">⚠</span><div><div style="font-weight:700;color:var(--danger)">Failed</div><div style="font-size:var(--t-sm);color:var(--muted)">${esc(err)}</div><button class="btn small" style="margin-top:var(--s2)" id="rb">Retry</button></div></div></div>`;

    if (photo && !busy) {
      h += `<div class="card" style="margin-top:var(--s3)"><div style="display:flex;gap:var(--s3);margin-bottom:var(--s3)"><img src="${photo}" class="photo-thumb"/><div style="flex:1"><button class="btn small" id="rk">📷 Retake</button>${!data && !err ? `<button class="btn primary small" id="ex" style="margin-left:var(--s2)">🔍 Read</button>` : ''}</div></div>`;
      if (data) {
        h += `<div style="border-top:1px solid var(--border);padding-top:var(--s3)">
          <div class="field"><label>Question</label><textarea class="input" id="eq" rows="2">${esc(data.question)}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)"><div class="field"><label>Your answer</label><input class="input input-sm" id="ey" value="${att(data.yourAnswer)}"/></div><div class="field"><label>Correct</label><input class="input input-sm" id="ec" value="${att(data.correctAnswer)}"/></div></div>
          <div class="field"><label>Topic</label><input class="input input-sm" id="et" value="${att((stickyModule ? stickyModule + ' — ' : '') + (data.topic || ''))}"/></div>
          <div style="border-top:1px solid var(--border);margin-top:var(--s3);padding-top:var(--s3)">

          <!-- Axis 1: Outcome -->
          <label style="font-size:var(--t-xs);font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--s1);display:block">Outcome</label>
          <div class="btns-grid" id="btns-outcome">${Object.entries(OUTCOMES).map(([k,v]) => `<button class="axis-btn pick-outcome ${picks.outcome === k ? 'sel' : ''}" data-k="${k}" style="${picks.outcome === k ? 'border-color:'+v.color+';background:'+v.color+'1a' : ''}"><span>${v.icon}</span> ${v.label}</button>`).join('')}</div>

          <!-- Axis 2: Failure Reason -->
          <label style="font-size:var(--t-xs);font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin:var(--s3) 0 var(--s1);display:block">Why missed</label>
          <div class="btns-grid btns-grid-4" id="btns-failure">${Object.entries(FAILURE_REASONS).map(([k,v]) => `<button class="axis-btn pick-failure ${picks.failure === k ? 'sel' : ''}" data-k="${k}">${v.label}</button>`).join('')}</div>

          <!-- Axis 3: Skill Level -->
          <label style="font-size:var(--t-xs);font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin:var(--s3) 0 var(--s1);display:block">Skill Level</label>
          <div class="btns-grid" id="btns-skill">${Object.entries(SKILL_LEVELS).map(([k,v]) => `<button class="axis-btn pick-skill ${picks.skill === k ? 'sel' : ''}" data-k="${k}">${v.label} <span style="color:var(--faint)">${v.short}</span></button>`).join('')}</div>

          <!-- Axis 4: FAR Node -->
          <label style="font-size:var(--t-xs);font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin:var(--s3) 0 var(--s1);display:block">FAR Content Area</label>
          <div class="btns-grid btns-grid-4" id="btns-farnode">${Object.entries(FAR_NODES).map(([k,v]) => `<button class="axis-btn pick-farnode ${picks.farNode === k ? 'sel' : ''}" data-k="${k}">${v.label}</button>`).join('')}</div>
          <div class="field" style="margin-top:var(--s2)"><input class="input input-sm" id="efs" placeholder="Sub-area (e.g. deferred taxes)" value="${att(picks.farSub || data.farSubNode || '')}"/></div>

          <!-- Axis 5: Confidence -->
          <label style="font-size:var(--t-xs);font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin:var(--s3) 0 var(--s1);display:block">Confidence (1-5)</label>
          <div class="btns-grid" id="btns-conf">${[1,2,3,4,5].map(n => `<button class="axis-btn pick-conf ${picks.confidence === n ? 'sel' : ''}" data-n="${n}">${n}</button>`).join('')}</div>

          </div>
          <button class="btn primary" style="width:100%;margin-top:var(--s4)" id="sv">Save → next</button></div>`;
      }
      h += `</div>`;
    }

    if (saved) h += `<div class="card" style="border-color:var(--success);margin-top:var(--s3);background:var(--success-soft)"><div style="display:flex;align-items:center;gap:var(--s2)"><span style="color:var(--success);font-size:var(--t-xl)">✓</span><div style="font-weight:700;color:var(--success)">${esc(saved)}</div></div></div>`;

    h += `<div class="card-sm" style="margin-top:var(--s3);display:flex;justify-content:space-around;text-align:center"><div><div style="font-weight:800;font-size:var(--t-lg)">${store.entries.length}</div><div style="font-size:var(--t-xs);color:var(--faint)">Total</div></div><div><div style="font-weight:800;font-size:var(--t-lg)">${today}</div><div style="font-size:var(--t-xs);color:var(--faint)">Today</div></div><div><div style="font-weight:800;font-size:var(--t-lg);color:var(--primary)">${due}</div><div style="font-size:var(--t-xs);color:var(--faint)">Due</div></div></div>`;

    w.innerHTML = h;
    wire(w);
  }

  function wire(w) {
    w.querySelector('#cz')?.addEventListener('click', () => w.querySelector('#pi')?.click());
    w.querySelector('#pi')?.addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = ev => { photo = ev.target.result; data = null; err = null; r(); }; rd.readAsDataURL(f); });

    w.querySelector('#sec')?.addEventListener('input', e => { stickySection = e.target.value; });
    w.querySelector('#mod')?.addEventListener('input', e => { stickyModule = e.target.value; });

    w.querySelector('#rk')?.addEventListener('click', () => { photo = null; data = null; err = null; r(); });
    w.querySelector('#ex')?.addEventListener('click', async () => { busy = true; r(); try { data = await extractFromPhoto(photo); picks.outcome = data.outcome || 'honest_gap'; picks.failure = data.failureReason || 'conceptual'; picks.skill = data.skillLevel || 'application'; picks.farNode = data.farNode || 'select_transactions'; picks.farSub = data.farSubNode || ''; picks.confidence = 3; busy = false; r(); } catch (e) { busy = false; err = e.message; r(); } });
    w.querySelector('#rb')?.addEventListener('click', () => { err = null; const ex2 = w.querySelector('#ex'); if (ex2) ex2.click(); });

    // Rapid-fire axis button handlers
    w.querySelectorAll('.pick-outcome').forEach(b => b.addEventListener('click', () => { picks.outcome = b.dataset.k; r(); }));
    w.querySelectorAll('.pick-failure').forEach(b => b.addEventListener('click', () => { picks.failure = b.dataset.k; r(); }));
    w.querySelectorAll('.pick-skill').forEach(b => b.addEventListener('click', () => { picks.skill = b.dataset.k; r(); }));
    w.querySelectorAll('.pick-farnode').forEach(b => b.addEventListener('click', () => { picks.farNode = b.dataset.k; r(); }));
    w.querySelectorAll('.pick-conf').forEach(b => b.addEventListener('click', () => { picks.confidence = parseInt(b.dataset.n); r(); }));
    w.querySelector('#efs')?.addEventListener('input', e => { picks.farSub = e.target.value; });

    w.querySelector('#sv')?.addEventListener('click', () => {
      const q = w.querySelector('#eq')?.value || '';
      if (!q.trim()) { alert('Question is required'); return; }
      addEntry({
        section: stickySection, module: stickyModule,
        question: q.trim(),
        yourAnswer: (w.querySelector('#ey')?.value || '').trim(),
        correctAnswer: (w.querySelector('#ec')?.value || '').trim(),
        outcome: picks.outcome,
        failureReason: picks.failure,
        skillLevel: picks.skill,
        farNode: picks.farNode,
        farSubNode: picks.farSub || '',
        confidence: picks.confidence
      });
      saved = stickyModule || 'Logged';
      photo = null; data = null; err = null;
      setTimeout(() => { saved = null; r(); }, 2500);
      r();
    });
  }

  r();
  return w;
}
