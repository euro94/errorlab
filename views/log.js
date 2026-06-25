/* ErrorLab — views/log.js: camera + AI + sequential popup matrix + error display */
import { addEntry, OUTCOMES, FAILURE_REASONS, SKILL_LEVELS, FAR_NODES_FLAT } from '../store.js';
import { extractFromPhoto, hasApiKey, setApiKey } from '../openai.js';

function esc(s) { try { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); } catch(e) { return String(s); } }
function att(s) { return esc(s).replace(/"/g, '&quot;'); }

let section = '', module = '';
let photo = null, data = null, busy = false, err = null, saved = null;
let picks = { outcome:'honest_gap', failure:'conceptual', skill:'application', farNode:'', farSub:'', confidence:3 };
let popup = 0;

export function renderLog() {
  const w = document.createElement('div'); w.className = 'fade-in';

  function r() {
    try {
      w.innerHTML = '<div class="card" style="margin:var(--s4);text-align:center"><div class="spinner"></div><p>Loading...</p></div>';
      if (!hasApiKey()) {
        w.innerHTML = `<div class="section-head">Fast Log</div><div class="card state"><div class="big">🔑</div><h2>API Key</h2><p>Enter your OpenAI key to enable photo capture</p><input class="input" id="ki" type="password" placeholder="sk-..." style="max-width:280px;display:block;margin:0 auto var(--s3)"/><button class="btn primary" id="ks">Save Key</button></div>`;
        w.querySelector('#ks').onclick = () => { const v = w.querySelector('#ki').value.trim(); if (v && v.startsWith('sk-')) { setApiKey(v); r(); } };
        return;
      }
      const store = window.__errorlabGetStore ? window.__errorlabGetStore() : { entries: [] };
      const today = store.entries.filter(e => { try { return new Date(e.date).toDateString() === new Date().toDateString(); } catch(_) { return false; } }).length;
      const due = store.entries.filter(e => { try { return e.fsrs && new Date(e.fsrs.due) <= new Date(); } catch(_) { return false; } }).length;

      let h = `<div class="section-head">Fast Log</div>
        <div class="card-sm" style="margin-bottom:var(--s3)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
            <input class="input input-sm" id="sec" placeholder="Section (FAR)" value="${att(section)}"/>
            <input class="input input-sm" id="mod" placeholder="Module (F3: Bonds)" value="${att(module)}"/>
          </div>
        </div>`;

      if (!photo) {
        h += `<div class="capture-zone" id="cz"><div class="capture-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-weight:700;color:var(--primary);margin-top:var(--s2)">Tap to capture</span></div><input type="file" accept="image/*" capture="environment" id="pi" hidden/></div>`;
      }

      if (busy) h += `<div class="card state" style="margin-top:var(--s3)"><div class="spinner"></div><h2>Reading...</h2></div>`;
      if (err) h += `<div class="card" style="margin-top:var(--s3);border-color:var(--danger)"><div style="display:flex;gap:var(--s2)"><span style="color:var(--danger);font-size:var(--t-xl)">⚠</span><div><div style="font-weight:700;color:var(--danger)">Failed</div><div style="font-size:var(--t-sm);color:var(--muted)">${esc(err)}</div><button class="btn small" style="margin-top:var(--s2)" id="rb">Retry</button></div></div></div>`;

      if (photo && !busy) {
        h += `<div class="card" style="margin-top:var(--s3)"><div style="display:flex;gap:var(--s3);margin-bottom:var(--s3)"><img src="${photo}" class="photo-thumb"/><div style="flex:1"><button class="btn small" id="rk">📷 Retake</button>${!data && !err ? `<button class="btn primary small" id="ex" style="margin-left:var(--s2)">🔍 Read</button>` : ''}</div></div>`;
        if (data) {
          h += `<div style="border-top:1px solid var(--border);padding-top:var(--s3)">
            <textarea class="input" id="eq" rows="2">${esc(data.question)}</textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-top:var(--s2)"><input class="input input-sm" id="ey" value="${att(data.yourAnswer)}" placeholder="Your answer"/><input class="input input-sm" id="ec" value="${att(data.correctAnswer)}" placeholder="Correct"/></div>
            <input class="input input-sm" id="et" style="margin-top:var(--s2)" value="${att((module?module+' — ':'')+(data.topic||''))}" placeholder="Topic"/>
            <div style="margin-top:var(--s3);display:grid;gap:var(--s1)">
              ${row('Outcome', OUTCOMES[picks.outcome]?.label||'?', picks.outcome==='misconception'?'#b71c1c':'var(--primary)', 1)}
              ${row('Why missed', FAILURE_REASONS[picks.failure]?.label||'?', 'var(--muted)', 2)}
              ${row('Skill', SKILL_LEVELS[picks.skill]?.label||'?', 'var(--muted)', 3)}
              ${row('FAR area', farLabel(picks.farNode), 'var(--muted)', 4)}
              ${row('Confidence', picks.confidence+'/5', 'var(--primary)', 5)}
            </div>
            <button class="btn primary" style="width:100%;margin-top:var(--s4)" id="sv">Save → next</button></div>`;
        }
        h += `</div>`;
      }

      if (saved) h += `<div class="card" style="border-color:var(--success);margin-top:var(--s3);background:var(--success-soft)"><div style="padding:var(--s3)"><span style="color:var(--success);font-size:var(--t-xl)">✓</span> <strong style="color:var(--success)">${esc(saved)}</strong></div></div>`;

      h += `<div class="card-sm" style="margin-top:var(--s3);display:flex;justify-content:space-around;text-align:center"><div><div style="font-weight:800;font-size:var(--t-lg)">${store.entries.length}</div><div style="font-size:10px;color:var(--faint)">Total</div></div><div><div style="font-weight:800;font-size:var(--t-lg)">${today}</div><div style="font-size:10px;color:var(--faint)">Today</div></div><div><div style="font-weight:800;font-size:var(--t-lg);color:var(--primary)">${due}</div><div style="font-size:10px;color:var(--faint)">Due</div></div></div>`;

      w.innerHTML = h;
      if (popup > 0) doPopup(w);
      else doWire(w);
    } catch(e) {
      w.innerHTML = `<div class="card state" style="margin:var(--s4)"><div class="big">❌</div><h2>Error</h2><p style="font-family:var(--mono);font-size:12px;color:var(--danger);word-break:break-all">${esc(e.message||String(e))}</p><button class="btn" onclick="location.reload()">Reload</button></div>`;
    }
  }

  function farLabel(key) {
    try {
      const n = FAR_NODES_FLAT.find(x => x.key === key);
      return n ? n.label : (key || 'Select...');
    } catch(_) { return key || 'Select...'; }
  }

  function row(label, value, color, axis) {
    return `<button class="popup-trigger" data-axis="${axis}" style="display:flex;justify-content:space-between;align-items:center;padding:var(--s2) var(--s3);border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface);cursor:pointer;font-size:var(--t-sm)"><span style="color:var(--faint)">${label}</span><span style="font-weight:700;color:${color}">${value}</span></button>`;
  }

  function doPopup(w) {
    let title, items, pickFn;
    switch (popup) {
      case 1: title = 'Outcome'; items = Object.entries(OUTCOMES).map(([k,v]) => ({ k, label: v.icon+' '+v.label, desc: v.desc })); pickFn = k => { picks.outcome = k; popup = 2; r(); }; break;
      case 2: title = 'Why did you miss it?'; items = Object.entries(FAILURE_REASONS).map(([k,v]) => ({ k, label: v.label, desc: v.short })); pickFn = k => { picks.failure = k; popup = 3; r(); }; break;
      case 3: title = 'Skill level'; items = Object.entries(SKILL_LEVELS).map(([k,v]) => ({ k, label: v.label, desc: v.short })); pickFn = k => { picks.skill = k; popup = 4; r(); }; break;
      case 4: title = 'FAR content area'; items = FAR_NODES_FLAT.map(n => ({ k: n.key, label: n.label, desc: n.area })); pickFn = k => { picks.farNode = k; popup = 5; r(); }; break;
      case 5: title = 'Confidence'; items = [1,2,3,4,5].map(n => ({ k: n, label: String(n) })); pickFn = n => { picks.confidence = n; popup = 0; r(); }; break;
      default: popup = 0; r(); return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'popup-overlay';
    overlay.innerHTML = `<div class="popup-backdrop"></div><div class="popup-card"><div class="popup-title">${title}</div><div class="popup-items">${items.map(i => `<button class="popup-choice${popup===1&&i.k==='misconception'?' popup-danger':''}" data-k="${i.k}"><span>${i.label}</span>${i.desc?`<span style="font-size:11px;color:var(--faint)">${i.desc}</span>`:''}</button>`).join('')}</div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.popup-choice').forEach(b => b.addEventListener('click', () => { pickFn(popup === 5 ? parseInt(b.dataset.k) : b.dataset.k); overlay.remove(); }));
    overlay.querySelector('.popup-backdrop').addEventListener('click', () => { popup = 0; overlay.remove(); r(); });
  }

  function doWire(w) {
    w.querySelector('#cz')?.addEventListener('click', () => w.querySelector('#pi')?.click());
    w.querySelector('#pi')?.addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = ev => { photo = ev.target.result; data = null; err = null; r(); }; rd.readAsDataURL(f); });
    w.querySelector('#sec')?.addEventListener('input', e => { section = e.target.value; });
    w.querySelector('#mod')?.addEventListener('input', e => { module = e.target.value; });
    w.querySelector('#rk')?.addEventListener('click', () => { photo = null; data = null; err = null; popup = 0; r(); });
    w.querySelector('#ex')?.addEventListener('click', async () => { busy = true; r(); try { data = await extractFromPhoto(photo); picks.outcome = data.outcome||'honest_gap'; picks.failure = data.failureReason||'conceptual'; picks.skill = data.skillLevel||'application'; picks.farNode = data.farNode||''; picks.farSub = data.farSubNode||''; picks.confidence = 3; busy = false; popup = 1; r(); } catch (e) { busy = false; err = e.message; r(); } });
    w.querySelector('#rb')?.addEventListener('click', () => { err = null; w.querySelector('#ex')?.click(); });
    w.querySelectorAll('.popup-trigger').forEach(b => b.addEventListener('click', () => { popup = parseInt(b.dataset.axis); r(); }));
    w.querySelector('#sv')?.addEventListener('click', () => {
      const q = w.querySelector('#eq')?.value||''; if (!q.trim()) return alert('Question required');
      addEntry({ section, module, question: q.trim(), yourAnswer: (w.querySelector('#ey')?.value||'').trim(), correctAnswer: (w.querySelector('#ec')?.value||'').trim(), outcome: picks.outcome, failureReason: picks.failure, skillLevel: picks.skill, farNode: picks.farNode, farSubNode: picks.farSub||'', confidence: picks.confidence });
      saved = module||'Logged'; photo = null; data = null; err = null; popup = 0; setTimeout(() => { saved = null; r(); }, 2500); r();
    });
  }

  try { r(); } catch(e) { w.innerHTML = '<div class="card state" style="margin:var(--s4)"><div class="big">❌</div><h2>Fatal Error</h2><p style="font-family:var(--mono);font-size:12px;color:var(--danger)">'+esc(e.message||String(e))+'</p></div>'; }
  return w;
}
