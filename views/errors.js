/* ErrorLab — views/errors.js: filterable error log table */
import { getStore, deleteEntry, CATEGORIES } from '../store.js';

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function prettyDate(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

function formatDue(fsrs) {
  if (!fsrs || !fsrs.due) return '—';
  const ms = new Date(fsrs.due) - Date.now();
  if (ms <= 0) return 'Now';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export function renderErrors() {
  const store = getStore();
  let filter = 'all';

  const wrap = document.createElement('div');
  wrap.className = 'fade-in';

  function renderTable(activeFilter) {
    filter = activeFilter || filter;
    const entries = store.entries.slice().reverse();
    const filtered = filter === 'all' ? entries : entries.filter(e => e.outcome === filter);

    let html = `
      <div class="section-head">Error Log</div>
      <div class="filter-bar">
        <button class="btn small ${filter === 'all' ? 'active-filter' : ''}" data-filter="all">All (${store.entries.length})</button>
        ${Object.entries(CATEGORIES).map(([k, v]) => `
          <button class="btn small ${filter === 'outcome_' + k ? 'active-filter' : ''}" data-filter="${k}">${v.label} (${0})</button>
        `).join('')}
      </div>
    `;

    if (filtered.length === 0) {
      html += `
        <div class="state">
          <div class="big">📋</div>
          <h2>No errors logged</h2>
          <p>Switch to the <strong>Log</strong> tab to start capturing your Becker misses. Every error you log becomes a re-test card with FSRS scheduling.</p>
        </div>
      `;
    } else {
      filtered.forEach(e => {
        const outcome = {mastered:{label:'Mastered'},fragile:{label:'Fragile'},honest_gap:{label:'Honest Gap'},misconception:{label:'Misconception'}}[e.outcome]||{label:'?'};
        html += `
          <div class="log-item">
            <div class="log-top">
              <span class="pill topic">${escapeHtml(e.topic)}</span>
              <span class="pill">${outcome.label}</span>
              <span class="pill" style="background:var(--surface-2);color:var(--muted)">Due ${formatDue(e.fsrs)}</span>
              <span style="flex:1"></span>
              <span class="log-meta">${prettyDate(e.date)}</span>
              <button class="btn small danger" data-delete="${e.id}" title="Delete entry">&times;</button>
            </div>
            <div class="log-q">${escapeHtml(e.question)}</div>
            ${(e.yourAnswer || e.correctAnswer) ? `
              <div class="log-answer">
                ${e.yourAnswer ? `<span class="wrong">${escapeHtml(e.yourAnswer)}</span>` : ''}
                ${e.correctAnswer ? `<span class="right">${escapeHtml(e.correctAnswer)}</span>` : ''}
              </div>
            ` : ''}
            ${e.why ? `<div class="log-why">${escapeHtml(e.why)}</div>` : ''}
          </div>
        `;
      });
    }

    wrap.innerHTML = html;

    // Wire filter buttons
    wrap.querySelectorAll('.filter-bar button').forEach(btn => {
      btn.addEventListener('click', () => renderTable(btn.dataset.filter));
    });

    // Wire delete buttons
    wrap.querySelectorAll('button[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this entry?')) {
          deleteEntry(btn.dataset.delete);
          renderTable();
          window.__errorlabToast('Entry deleted');
        }
      });
    });
  }

  renderTable('all');
  return wrap;
}
