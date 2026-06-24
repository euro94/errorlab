/* ErrorLab — views/mini.js: timed mini-session quizzes */
import { getStore, applyRating, getRatingPreview } from '../store.js';
import { Rating } from '../fsrs.js';

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Session configs: label, questions, time_sec
const PRESETS = [
  { label: '3 min', qCount: 5,  time: 180 },
  { label: '5 min', qCount: 10, time: 300 },
  { label: '10 min', qCount: 20, time: 600 },
];

let sessionState = null; // { questions: [], idx: 0, started: null, timeLeft: 0, timer: null }
let revealed = false;
let previews = null;

export function renderMini(onDone) {
  sessionState = null; // reset on re-render
  const store = getStore();

  const wrap = document.createElement('div');
  wrap.className = 'fade-in';

  function renderPicker() {
    // Clean up any running timer
    if (sessionState && sessionState.timer) {
      clearInterval(sessionState.timer);
      sessionState = null;
    }
    revealed = false;
    previews = null;

    let html = `
      <div class="section-head">Mini Sessions</div>
      <p class="hint" style="margin:0 0 var(--s4)">Quick fire re-tests from your error log. Tap a duration to start a timed quiz. Use these in the 3-5 minute gaps in your day.</p>
    `;

    if (store.entries.length === 0) {
      html += `
        <div class="state">
          <div class="big">⏱️</div>
          <h2>No errors to quiz</h2>
          <p>Log some Becker misses first in the <strong>Log</strong> tab, then come back for mini-sessions.</p>
        </div>
      `;
    } else {
      html += `<div class="mini-config">`;
      PRESETS.forEach(p => {
        const available = Math.min(p.qCount, store.entries.length);
        html += `
          <div class="mini-opt" data-count="${p.qCount}" data-time="${p.time}">
            <div class="mini-time">${p.label}</div>
            <div class="mini-label">timer</div>
            <div class="mini-count">${available} cards</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    wrap.innerHTML = html;

    // Wire presets
    wrap.querySelectorAll('.mini-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const qCount = parseInt(opt.dataset.count);
        const time = parseInt(opt.dataset.time);
        startSession(qCount, time);
      });
    });
  }

  function startSession(qCount, time) {
    // Pick random entries
    const pool = [...store.entries];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, Math.min(qCount, pool.length));

    if (questions.length === 0) {
      renderPicker();
      return;
    }

    sessionState = {
      questions,
      idx: 0,
      started: Date.now(),
      timeLeft: time,
      timeTotal: time,
      timer: null
    };
    revealed = false;
    previews = null;

    renderQuiz();

    // Start timer
    sessionState.timer = setInterval(() => {
      sessionState.timeLeft--;
      updateTimer();
      if (sessionState.timeLeft <= 0) {
        endSession();
      }
    }, 1000);
  }

  function updateTimer() {
    const el = wrap.querySelector('#miniTimer');
    if (!el) return;
    const mins = Math.floor(sessionState.timeLeft / 60);
    const secs = sessionState.timeLeft % 60;
    el.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    if (sessionState.timeLeft < 30) el.style.color = 'var(--danger)';
    else el.style.color = '';
  }

  function endSession() {
    if (sessionState && sessionState.timer) {
      clearInterval(sessionState.timer);
    }
    const elapsed = Math.round((Date.now() - sessionState.started) / 60000);
    const done = sessionState.idx;

    wrap.innerHTML = `
      <div class="state">
        <div class="big">&#10003;</div>
        <h2>Session complete</h2>
        <p>${done} of ${sessionState.questions.length} cards reviewed in ~${elapsed} min.</p>
        <button class="btn primary" id="doneBtn">Back to sessions</button>
      </div>
    `;
    wrap.querySelector('#doneBtn').addEventListener('click', () => {
      sessionState = null;
      renderPicker();
    });
    if (onDone) onDone();
  }

  function renderQuiz() {
    if (!sessionState) { renderPicker(); return; }
    const s = sessionState;

    if (s.idx >= s.questions.length) {
      endSession();
      return;
    }

    const entry = s.questions[s.idx];
    previews = getRatingPreview(entry.fsrs);
    const pct = Math.round((s.idx / s.questions.length) * 100);
    const mins = Math.floor(s.timeLeft / 60);
    const secs = s.timeLeft % 60;

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s2)">
        <span class="hint" style="font-family:var(--mono)">Quiz ${s.idx + 1}/${s.questions.length}</span>
        <span id="miniTimer" style="font-weight:800;font-size:var(--t-xl);font-family:var(--mono);color:${s.timeLeft < 30 ? 'var(--danger)' : 'var(--primary)'}">${mins}:${String(secs).padStart(2, '0')}</span>
      </div>
      <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
      <div class="retest-card">
        <div class="rt-header">
          <div>
            <span class="pill topic">${escapeHtml(entry.topic)}</span>
            <span class="pill ${entry.category}">${entry.category}</span>
          </div>
          <span class="log-meta">Reps: ${entry.reps || 0}</span>
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
        </div>
        <div class="rt-rating">
          <button class="again" data-rate="1"><span class="rt-label">Again</span><span class="rt-due">${previews[Rating.Again].due}</span></button>
          <button class="hard" data-rate="2"><span class="rt-label">Hard</span><span class="rt-due">${previews[Rating.Hard].due}</span></button>
          <button class="good" data-rate="3"><span class="rt-label">Good</span><span class="rt-due">${previews[Rating.Good].due}</span></button>
          <button class="easy" data-rate="4"><span class="rt-label">Easy</span><span class="rt-due">${previews[Rating.Easy].due}</span></button>
        </div>
      `;
    } else {
      html += `<div style="text-align:center;margin-top:var(--s4)"><button class="btn primary" id="showBtn">Show Answer</button></div>`;
    }

    html += `</div>`;
    wrap.innerHTML = html;

    updateTimer();

    const showBtn = wrap.querySelector('#showBtn');
    if (showBtn) {
      showBtn.addEventListener('click', () => { revealed = true; renderQuiz(); });
    }

    wrap.querySelectorAll('.rt-rating button').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rate);
        applyRating(entry, rating);
        try { localStorage.setItem('errorlab_v1', JSON.stringify(getStore())); } catch(e) {}
        s.idx++;
        revealed = false;
        previews = null;
        renderQuiz();
      });
    });
  }

  function quitSession() {
    if (sessionState && sessionState.timer) clearInterval(sessionState.timer);
    sessionState = null;
    renderPicker();
  }

  // Add quit button
  if (sessionState) {
    // Timer already running from a re-render — add a quit overlay
    // Actually, renderQuiz() handles the full state. Let's just render the quiz.
    renderQuiz();
  } else {
    renderPicker();
  }

  return wrap;
}
