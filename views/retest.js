/* ErrorLab — views/retest.js: FSRS-spaced re-test queue */
import { getStore, getDueEntries, applyRating, getRatingPreview } from '../store.js';
import { Rating } from '../fsrs.js';

let currentIdx = 0;
let revealed = false;
let previews = null;

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function renderRetest() {
  currentIdx = 0; revealed = false; previews = null; // reset on re-render
  const due = getDueEntries();

  const wrap = document.createElement('div');
  wrap.className = 'fade-in';

  function renderCard() {
    const store = getStore();
    const totalReviews = store.entries.reduce((s, e) => s + (e.reps || 0), 0);
    const totalLapses = store.entries.reduce((s, e) => s + (e.lapses || 0), 0);

    let html = `
      <div class="section-head">Re-Test Queue</div>
      <div class="summary-row">
        <div class="summary-item"><div class="val">${due.length}</div><div class="lbl">Due today</div></div>
        <div class="summary-item"><div class="val">${store.entries.length}</div><div class="lbl">Total errors</div></div>
        <div class="summary-item"><div class="val">${totalReviews}</div><div class="lbl">Reviews</div></div>
      </div>
    `;

    if (due.length === 0) {
      html += `
        <div class="state">
          <div class="big">&#10003;</div>
          <h2>All caught up</h2>
          <p>No errors due for re-test. Log more misses in the <strong>Log</strong> tab to build your review queue.</p>
        </div>
      `;
      wrap.innerHTML = html;
      return;
    }

    if (currentIdx >= due.length) currentIdx = 0;
    const entry = due[currentIdx];
    previews = getRatingPreview(entry.fsrs);

    // Progress
    const pct = Math.round(((currentIdx) / due.length) * 100);
    html += `
      <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
      <div style="text-align:center;margin-bottom:var(--s3)">
        <span class="hint" style="font-family:var(--mono)">${currentIdx + 1} / ${due.length} due</span>
      </div>
    `;

    html += `
      <div class="retest-card">
        <div class="rt-header">
          <div>
            <span class="pill topic">${escapeHtml(entry.topic)}</span>
            <span class="pill ${entry.category}">${entry.category}</span>
          </div>
          <span class="log-meta">Reps: ${entry.reps || 0} &middot; Lapses: ${entry.lapses || 0}</span>
        </div>
        <div class="rt-q">${escapeHtml(entry.question)}</div>
    `;

    if (revealed) {
      html += `
        <div class="rt-reveal">
          <div class="pair">
            <span style="color:var(--faint);font-weight:600">You answered:</span>
            <span style="color:var(--danger);text-decoration:line-through">${escapeHtml(entry.yourAnswer)}</span>
          </div>
          <div class="pair">
            <span style="color:var(--faint);font-weight:600">Correct:</span>
            <span style="color:var(--success);font-weight:700">${escapeHtml(entry.correctAnswer)}</span>
          </div>
          ${entry.why ? `<div style="margin-top:var(--s2);padding-top:var(--s2);border-top:1px solid var(--border);font-size:var(--t-xs);color:var(--muted);font-style:italic">${escapeHtml(entry.why)}</div>` : ''}
        </div>
        <p style="font-size:var(--t-xs);color:var(--muted);margin:0 0 var(--s3);text-align:center">How well did you remember this?</p>
        <div class="rt-rating">
          <button class="again" data-rate="1"><span class="rt-label">Again</span><span class="rt-due">${previews[Rating.Again].due}</span></button>
          <button class="hard" data-rate="2"><span class="rt-label">Hard</span><span class="rt-due">${previews[Rating.Hard].due}</span></button>
          <button class="good" data-rate="3"><span class="rt-label">Good</span><span class="rt-due">${previews[Rating.Good].due}</span></button>
          <button class="easy" data-rate="4"><span class="rt-label">Easy</span><span class="rt-due">${previews[Rating.Easy].due}</span></button>
        </div>
      `;
    } else {
      html += `
        <div style="text-align:center;margin-top:var(--s4)">
          <button class="btn primary" id="revealBtn">Show Answer</button>
        </div>
      `;
    }

    html += `</div>`;
    wrap.innerHTML = html;

    // Wire buttons
    const revealBtn = wrap.querySelector('#revealBtn');
    if (revealBtn) {
      revealBtn.addEventListener('click', () => {
        revealed = true;
        renderCard();
      });
    }

    wrap.querySelectorAll('.rt-rating button').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rate);
        applyRating(entry, rating);
        const store = getStore();
        // persist
        try { localStorage.setItem('errorlab_v1', JSON.stringify(store)); } catch(e) {}
        revealed = false;
        previews = null;
        // Move to next if current isn't due anymore
        const stillDue = getDueEntries();
        if (currentIdx < stillDue.length && stillDue[currentIdx] && stillDue[currentIdx].id === entry.id) {
          // Card still due (rated Again), keep it at this position
        } else if (currentIdx >= stillDue.length) {
          currentIdx = 0;
        }
        renderCard();
      });
    });
  }

  renderCard();
  return wrap;
}
