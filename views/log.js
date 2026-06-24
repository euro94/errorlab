/* ErrorLab — views/log.js: camera capture + AI pipeline + sticky section/module */
import { addEntry, CATEGORIES, getStore } from '../store.js';
import { extractFromPhoto, hasApiKey, setApiKey } from '../openai.js';

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function att(s) { return esc(s).replace(/"/g,'&quot;'); }

let stickySection = '';
let stickyModule = '';
let photo = null;
let data = null;
let busy = false;
let err = null;
let saved = null;

export function renderLog() {
  const w = document.createElement('div');
  w.className = 'fade-in';

  function r() {
    if (!hasApiKey()) {
      w.innerHTML = `<div class="section-head">Fast Log</div><div class="card state"><div class="big">🔑</div><h2>Set your OpenAI API key</h2><p>GPT-4o-mini reads your Becker photos. Key stays in this browser.</p><input class="input" id="ki" type="password" placeholder="sk-..." style="max-width:280px;display:block;margin:0 auto var(--s3)"/><button class="btn primary" id="ks">Save Key</button></div>`;
      w.querySelector('#ks').onclick=()=>{const v=w.querySelector('#ki').value.trim();if(v&&v.startsWith('sk-')){setApiKey(v);window.__errorlabToast('Saved');r();}else alert('Valid key starts with sk-');};
      return;
    }
    const store = getStore();
    const today = store.entries.filter(e=>new Date(e.date).toDateString()===new Date().toDateString()).length;
    const due = store.entries.filter(e=>e.fsrs&&new Date(e.fsrs.due)<=new Date()).length;

    let h = `<div class="section-head">Fast Log</div>
      <div class="card-sm" style="margin-bottom:var(--s3)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
          <div class="field" style="margin:0"><label style="font-size:var(--t-xs)">Section</label><input class="input input-sm" id="sec" placeholder="FAR / AUD / REG" value="${att(stickySection)}" /></div>
          <div class="field" style="margin:0"><label style="font-size:var(--t-xs)">Module</label><input class="input input-sm" id="mod" placeholder="F3: Bonds" value="${att(stickyModule)}" /></div>
        </div>
      </div>`;

    if (!photo) {
      h += `<div class="capture-zone" id="cz"><div class="capture-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-weight:700;color:var(--primary);margin-top:var(--s2)">Tap to capture</span></div><input type="file" accept="image/*" capture="environment" id="pi" hidden/></div>`;
    }

    if (busy) h += `<div class="card state" style="margin-top:var(--s3)"><div class="spinner"></div><h2>Reading...</h2></div>`;

    if (err) h += `<div class="card" style="margin-top:var(--s3);border-color:var(--danger)"><div style="display:flex;gap:var(--s2);align-items:flex-start"><span style="color:var(--danger);font-size:var(--t-xl)">⚠</span><div><div style="font-weight:700;color:var(--danger)">Failed</div><div style="font-size:var(--t-sm);color:var(--muted)">${esc(err)}</div><button class="btn small" style="margin-top:var(--s2)" id="rb">Retry</button></div></div></div>`;

    if (photo && !busy) {
      h += `<div class="card" style="margin-top:var(--s3)"><div style="display:flex;gap:var(--s3);margin-bottom:var(--s3)"><img src="${photo}" class="photo-thumb"/><div style="flex:1"><button class="btn small" id="rk">📷 Retake</button>${!data&&!err?`<button class="btn primary small" id="ex" style="margin-left:var(--s2)">🔍 Read</button>`:''}</div></div>`;
      if (data) {
        const topic = (stickyModule ? stickyModule + ' — ' : '') + (data.topic || '');
        h += `<div style="border-top:1px solid var(--border);padding-top:var(--s3)">
          <div class="field"><label>Question</label><textarea class="input" id="eq" rows="2">${esc(data.question)}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)"><div class="field"><label>Your answer (wrong)</label><input class="input" id="ey" value="${att(data.yourAnswer)}"/></div><div class="field"><label>Correct</label><input class="input" id="ec" value="${att(data.correctAnswer)}"/></div></div>
          <div class="field"><label>Topic</label><input class="input" id="et" value="${att(topic)}"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)"><div class="field"><label>Why missed</label><select class="input" id="ew">${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}" ${data.errorCategory===k?'selected':''}>${v.label}</option>`).join('')}</select></div><div class="field"><label>Note</label><input class="input" id="en" placeholder="e.g. forgot formula" value="${att(data.errorNote||'')}"/></div></div>
          <button class="btn primary" style="width:100%;margin-top:var(--s3)" id="sv">Save → next</button></div>`;
      }
      h += `</div>`;
    }

    if (saved) h += `<div class="card" style="border-color:var(--success);margin-top:var(--s3);background:var(--success-soft)"><div style="display:flex;align-items:center;gap:var(--s2)"><span style="color:var(--success);font-size:var(--t-xl)">✓</span><div><div style="font-weight:700;color:var(--success)">Saved</div><div style="font-size:var(--t-sm);color:var(--muted)">${esc(saved)}</div></div></div></div>`;

    h += `<div class="card-sm" style="margin-top:var(--s3);display:flex;justify-content:space-around;text-align:center"><div><div style="font-weight:800;font-size:var(--t-lg)">${store.entries.length}</div><div style="font-size:var(--t-xs);color:var(--faint)">Total</div></div><div><div style="font-weight:800;font-size:var(--t-lg)">${today}</div><div style="font-size:var(--t-xs);color:var(--faint)">Today</div></div><div><div style="font-weight:800;font-size:var(--t-lg);color:var(--primary)">${due}</div><div style="font-size:var(--t-xs);color:var(--faint)">Due</div></div></div>`;

    w.innerHTML = h;
    wire(w);
  }

  function wire(w) {
    const cz = w.querySelector('#cz'), pi = w.querySelector('#pi');
    if (cz && pi) { cz.onclick = () => pi.click(); pi.onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = ev => { photo = ev.target.result; data = null; err = null; r(); }; rd.readAsDataURL(f); }; }

    const secEl = w.querySelector('#sec'), modEl = w.querySelector('#mod');
    if (secEl) secEl.oninput = () => { stickySection = secEl.value; };
    if (modEl) modEl.oninput = () => { stickyModule = modEl.value; };

    const rk = w.querySelector('#rk'); if (rk) rk.onclick = () => { photo = null; data = null; err = null; r(); };
    const ex = w.querySelector('#ex'); if (ex) ex.onclick = async () => { busy = true; r(); try { data = await extractFromPhoto(photo); busy = false; r(); } catch (e) { busy = false; err = e.message; r(); } };
    const rb = w.querySelector('#rb'); if (rb) rb.onclick = () => { err = null; const ex2 = w.querySelector('#ex'); if (!ex2) { busy = true; r(); extractFromPhoto(photo).then(d => { data = d; busy = false; r(); }).catch(e => { busy = false; err = e.message; r(); }); } };
    const sv = w.querySelector('#sv'); if (sv) sv.onclick = () => {
      const q = w.querySelector('#eq')?.value || '';
      if (!q.trim()) { alert('Question is required'); return; }
      addEntry({ topic: (w.querySelector('#et')?.value || '').trim(), question: q.trim(), yourAnswer: (w.querySelector('#ey')?.value || '').trim(), correctAnswer: (w.querySelector('#ec')?.value || '').trim(), category: w.querySelector('#ew')?.value || 'understanding', why: (w.querySelector('#en')?.value || '').trim() });
      saved = stickyModule || 'Logged';
      photo = null; data = null; err = null;
      setTimeout(() => { saved = null; r(); }, 2500);
      window.__errorlabToast('✓ Saved');
      r();
    };
  }

  r();
  return w;
}
