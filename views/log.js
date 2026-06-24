/* ErrorLab — views/log.js: batch capture form for rapid Becker error logging */
import { addEntry, CATEGORIES } from '../store.js';

// Track batch entries in memory during the session
let batchEntries = [];

function emptyEntry() {
  return { topic: '', question: '', yourAnswer: '', correctAnswer: '', category: 'understanding', why: '' };
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

export function renderLog(onChange) {
  // Reset batch if empty
  if (batchEntries.length === 0) batchEntries.push(emptyEntry());

  const wrap = document.createElement('div');
  wrap.className = 'fade-in';
  wrap.innerHTML = `
    <div class="section-head">Batch Log</div>
    <p class="hint" style="margin:0 0 var(--s4)">Paste your Becker error details below. Each row = one missed question. Fill in the fields and hit <strong>Save All</strong> at the bottom.</p>
    <div class="batch-entries" id="batchEntries"></div>
    <div class="row" style="margin-top:var(--s3)">
      <button class="btn small" id="addRowBtn">+ Add row</button>
      <span class="spacer" style="flex:1"></span>
      <span class="hint" id="batchCount" style="margin-right:var(--s2)"></span>
      <button class="btn primary" id="saveAllBtn">Save All</button>
    </div>
  `;

  // Render batch entries
  const container = wrap.querySelector('#batchEntries');

  function renderBatch() {
    container.innerHTML = '';
    batchEntries.forEach((entry, idx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'card-sm';
      rowEl.style.marginBottom = 'var(--s2)';
      rowEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:var(--s2);margin-bottom:var(--s2)">
          <span style="font-weight:700;font-size:var(--t-sm);color:var(--muted);font-family:var(--mono)">#${idx + 1}</span>
          <input class="input input-sm" style="flex:1" placeholder="Topic (e.g. Bonds, Leases)" data-idx="${idx}" data-field="topic" value="${escapeAttr(entry.topic)}" />
          <button class="btn small danger" data-idx="${idx}" data-action="remove" ${batchEntries.length <= 1 ? 'disabled' : ''}>&times;</button>
        </div>
        <div class="field" style="margin-bottom:var(--s1)">
          <input class="input input-sm" placeholder="Question (short summary)" data-idx="${idx}" data-field="question" value="${escapeAttr(entry.question)}" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-bottom:var(--s1)">
          <div class="field" style="margin-bottom:0">
            <label class="hint">Your answer</label>
            <input class="input input-sm" placeholder="What you picked" data-idx="${idx}" data-field="yourAnswer" value="${escapeAttr(entry.yourAnswer)}" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label class="hint">Correct answer</label>
            <input class="input input-sm" placeholder="The right answer" data-idx="${idx}" data-field="correctAnswer" value="${escapeAttr(entry.correctAnswer)}" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
          <div class="field" style="margin-bottom:0">
            <label class="hint">Error category</label>
            <select class="input input-sm" data-idx="${idx}" data-field="category">
              ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${entry.category === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin-bottom:0">
            <label class="hint">Why you missed it</label>
            <input class="input input-sm" placeholder="Brief reason" data-idx="${idx}" data-field="why" value="${escapeAttr(entry.why)}" />
          </div>
        </div>
      `;

      // Event delegation for inputs and buttons
      rowEl.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => {
          const i = parseInt(el.dataset.idx);
          const field = el.dataset.field;
          if (batchEntries[i]) {
            batchEntries[i][field] = el.value;
            updateCount();
          }
        });
        el.addEventListener('change', () => {
          const i = parseInt(el.dataset.idx);
          const field = el.dataset.field;
          if (batchEntries[i]) {
            batchEntries[i][field] = el.value;
            updateCount();
          }
        });
      });

      rowEl.querySelectorAll('button[data-action="remove"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.idx);
          batchEntries.splice(i, 1);
          if (batchEntries.length === 0) batchEntries.push(emptyEntry());
          renderBatch();
          updateCount();
        });
      });

      container.appendChild(rowEl);
    });
  }

  function updateCount() {
    const filled = batchEntries.filter(e => e.topic || e.question).length;
    wrap.querySelector('#batchCount').textContent = `${filled}/${batchEntries.length} filled`;
  }

  renderBatch();
  updateCount();

  // Add row button
  wrap.querySelector('#addRowBtn').addEventListener('click', () => {
    batchEntries.push(emptyEntry());
    renderBatch();
    updateCount();
  });

  // Save all button
  wrap.querySelector('#saveAllBtn').addEventListener('click', () => {
    const valid = batchEntries.filter(e => e.topic && e.question);
    if (valid.length === 0) {
      alert('Fill in at least one row with a topic and question before saving.');
      return;
    }
    valid.forEach(e => addEntry(e));
    batchEntries = [emptyEntry()];
    renderBatch();
    updateCount();
    if (onChange) onChange();
    window.__errorlabToast(`${valid.length} question${valid.length > 1 ? 's' : ''} logged`);
  });

  return wrap;
}
