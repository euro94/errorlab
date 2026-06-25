/* ErrorLab — views/errors.js: Becker-structured tiered error log */
import { getStore, deleteEntry, OUTCOMES } from '../store.js';

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function fmtDue(fsrs) {
  if (!fsrs || !fsrs.due) return '';
  const ms = new Date(fsrs.due) - Date.now();
  if (ms <= 0) return 'Due now';
  const m = Math.round(ms/60000);
  if (m < 60) return `Due ${m}m`;
  const h = Math.round(m/60);
  if (h < 24) return `Due ${h}h`;
  return `Due ${Math.round(h/24)}d`;
}

function outcomeBadge(o) {
  const map = { mastered: {label:'✓',c:'#2d8a56'}, fragile: {label:'⚡',c:'#b3711a'}, honest_gap: {label:'📖',c:'#c4413c'}, misconception: {label:'⚠',c:'#b71c1c'} };
  const b = map[o] || {label:'?',c:'var(--muted)'};
  return `<span style="color:${b.c};font-weight:700;font-size:14px" title="${OUTCOMES[o]?.label||o}">${b.label}</span>`;
}

export function renderErrors() {
  const store = getStore();
  const entries = [...store.entries].reverse();
  const wrap = document.createElement('div'); wrap.className = 'fade-in';

  // Group by section → module
  const tree = {};
  entries.forEach(e => {
    const sec = e.section || 'Unfiled';
    const mod = e.module || 'General';
    if (!tree[sec]) tree[sec] = {};
    if (!tree[sec][mod]) tree[sec][mod] = [];
    tree[sec][mod].push(e);
  });

  // Collapsed state
  const collapsed = {};

  function render() {
    let h = `<div class="section-head">Error Log</div>`;

    if (entries.length === 0) {
      h += `<div class="state"><div class="big">📋</div><h2>No errors</h2><p>Snap a photo in the Log tab to start building your error log.</p></div>`;
      wrap.innerHTML = h;
      return;
    }

    // Stats bar
    const misconceptions = entries.filter(e => e.outcome === 'misconception').length;
    const fragile = entries.filter(e => e.outcome === 'fragile').length;
    const dueNow = entries.filter(e => e.fsrs && new Date(e.fsrs.due) <= new Date()).length;
    h += `<div class="card-sm" style="display:flex;justify-content:space-around;text-align:center;margin-bottom:var(--s3)">
      <div><div style="font-weight:800;color:#b71c1c;font-size:var(--t-lg)">${misconceptions}</div><div style="font-size:10px;color:var(--faint)">Misconceptions</div></div>
      <div><div style="font-weight:800;color:#b3711a;font-size:var(--t-lg)">${fragile}</div><div style="font-size:10px;color:var(--faint)">Fragile</div></div>
      <div><div style="font-weight:800;color:var(--primary);font-size:var(--t-lg)">${dueNow}</div><div style="font-size:10px;color:var(--faint)">Due now</div></div>
      <div><div style="font-weight:800;font-size:var(--t-lg)">${entries.length}</div><div style="font-size:10px;color:var(--faint)">Total</div></div>
    </div>`;

    // Render tree
    Object.keys(tree).sort().forEach(sec => {
      const isSecOpen = !collapsed[sec];
      const secTotal = Object.values(tree[sec]).reduce((s, arr) => s + arr.length, 0);
      const secMisconceptions = Object.values(tree[sec]).flat().filter(e => e.outcome === 'misconception').length;

      h += `<div class="section-group">
        <button class="section-toggle" data-sec="${esc(sec)}" style="display:flex;align-items:center;gap:var(--s2);width:100%;padding:var(--s3) 0;background:none;border:none;color:var(--text);font-family:var(--font);font-size:var(--t-base);font-weight:700;cursor:pointer">
          <span style="transition:transform 150ms;${isSecOpen?'':'transform:rotate(-90deg)'}">▾</span>
          <span style="flex:1;text-align:left">${esc(sec)}</span>
          <span style="font-size:var(--t-xs);color:var(--faint);font-weight:500">${secTotal}</span>
          ${secMisconceptions > 0 ? `<span style="margin-left:var(--s2);font-size:var(--t-xs);color:#b71c1c">${secMisconceptions}⚠</span>` : ''}
        </button>
      </div>`;

      if (isSecOpen) {
        Object.keys(tree[sec]).sort().forEach(mod => {
          const modEntries = tree[sec][mod];
          const modKey = sec + '::' + mod;
          const isModOpen = !collapsed[modKey];

          h += `<div style="padding-left:var(--s5);margin-bottom:var(--s1)">
            <button class="section-toggle" data-sec="${esc(modKey)}" style="display:flex;align-items:center;gap:var(--s2);width:100%;padding:var(--s2) 0;background:none;border:none;color:var(--muted);font-family:var(--font);font-size:var(--t-sm);font-weight:600;cursor:pointer">
              <span style="font-size:10px;transition:transform 150ms;${isModOpen?'':'transform:rotate(-90deg)'}">▾</span>
              <span style="flex:1;text-align:left">${esc(mod)}</span>
              <span style="font-size:var(--t-xs);color:var(--faint)">${modEntries.length}</span>
            </button>`;

          if (isModOpen) {
            modEntries.forEach(e => {
              h += `<div class="log-item" style="padding:var(--s2);border-left:2px solid ${e.outcome==='misconception'?'#b71c1c':e.outcome==='fragile'?'#b3711a':'var(--border)'}">
                <div style="display:flex;align-items:center;gap:var(--s2)">
                  ${outcomeBadge(e.outcome)}
                  <span style="flex:1;font-size:var(--t-sm);font-weight:500">${esc(e.question)}</span>
                  <span style="font-size:10px;color:var(--faint);font-family:var(--mono);white-space:nowrap">${fmtDue(e.fsrs)}</span>
                  <button class="btn small danger" data-del="${e.id}" style="padding:2px 6px;font-size:10px">&times;</button>
                </div>
                ${(e.yourAnswer||e.correctAnswer)?`<div style="display:flex;gap:var(--s3);margin-top:var(--s1);font-size:var(--t-xs)">${e.yourAnswer?`<span style="color:var(--danger);text-decoration:line-through">${esc(e.yourAnswer)}</span>`:''}${e.correctAnswer?`<span style="color:var(--success);font-weight:600">${esc(e.correctAnswer)}</span>`:''}</div>`:''}
              </div>`;
            });
          }
          h += `</div>`;
        });
      }
    });

    wrap.innerHTML = h;

    // Toggle section collapse
    wrap.querySelectorAll('.section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.sec;
        collapsed[k] = !collapsed[k];
        render();
      });
    });

    // Delete
    wrap.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete?')) { deleteEntry(btn.dataset.del); render(); }
      });
    });
  }

  render();
  return wrap;
}
