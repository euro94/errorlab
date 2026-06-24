/* ErrorLab — views/log.js: photo capture + AI extraction pipeline */
import { addEntry, CATEGORIES, getStore } from '../store.js';
import { extractFromPhoto, hasApiKey, setApiKey } from '../openai.js';

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

// Current capture session state
let capturedPhoto = null;       // base64 data URL
let extractedData = null;       // { question, correctAnswer, yourAnswer, topic }
let processing = false;
let errorMsg = null;

// Track recently saved for the "just saved" feedback
let lastSaved = null;

export function renderLog() {
  const wrap = document.createElement('div');
  wrap.className = 'fade-in';

  function render() {
    const hasKey = hasApiKey();
    if (!hasKey) {
      wrap.innerHTML = `
        <div class="section-head">Fast Log</div>
        <div class="card state">
          <div class="big">🔑</div>
          <h2>Set your OpenAI API key</h2>
          <p>ErrorLab uses GPT-4o-mini to read your Becker question photos and extract the question, answer, and your response automatically. Your key is stored only in this browser.</p>
          <div style="margin-bottom:var(--s3)">
            <input class="input" id="apiKeyInput" type="password" placeholder="sk-..." style="max-width:320px;margin:0 auto;display:block" />
          </div>
          <button class="btn primary" onclick="document.getElementById('apiKeyInput').dispatchEvent(new CustomEvent('savekey'))">Save Key</button>
          <p style="margin-top:var(--s3);font-size:var(--t-xs);color:var(--faint)">Model: gpt-4o-mini · ~$0.00015/image · key never leaves your browser</p>
        </div>
      `;
      // Save key handler
      const input = wrap.querySelector('#apiKeyInput');
      input.addEventListener('savekey', () => {
        const key = input.value.trim();
        if (key && key.startsWith('sk-')) {
          setApiKey(key);
          window.__errorlabToast('API key saved');
          render();
        } else {
          alert('Enter a valid OpenAI API key (starts with sk-)');
        }
      });
      return;
    }

    // Build the main capture UI
    let html = `
      <div class="section-head">Fast Log</div>
      <p class="hint" style="margin:0 0 var(--s3)">Snap a photo of your Becker question. AI reads it and fills everything in.</p>
    `;

    // Capture area
    if (!capturedPhoto) {
      html += `
        <div class="capture-zone" id="captureZone">
          <div class="capture-inner">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span style="font-weight:700;color:var(--primary);margin-top:var(--s2)">Tap to capture</span>
            <span style="font-size:var(--t-xs);color:var(--faint)">Photo of Becker question screen</span>
          </div>
          <input type="file" accept="image/*" capture="environment" id="photoInput" style="display:none" />
        </div>
      `;
    }

    // Processing state
    if (processing) {
      html += `
        <div class="card state" style="margin-top:var(--s4)">
          <div class="spinner"></div>
          <h2>Reading your question...</h2>
          <p>GPT-4o-mini is extracting the question, correct answer, your answer, and topic.</p>
        </div>
      `;
    }

    // Error state
    if (errorMsg) {
      html += `
        <div class="card" style="margin-top:var(--s3);border-color:var(--danger)">
          <div style="display:flex;align-items:flex-start;gap:var(--s2)">
            <span style="color:var(--danger);font-size:var(--t-xl);flex-shrink:0">⚠</span>
            <div>
              <div style="font-weight:700;color:var(--danger);margin-bottom:var(--s1)">Extraction failed</div>
              <div style="font-size:var(--t-sm);color:var(--muted)">${escapeHtml(errorMsg)}</div>
              <button class="btn small" style="margin-top:var(--s2)" id="retryBtn">Try again</button>
            </div>
          </div>
        </div>
      `;
    }

    // Preview + extracted data
    if (capturedPhoto && !processing) {
      html += `
        <div class="card" style="margin-top:var(--s3)">
          <div style="display:flex;gap:var(--s3);margin-bottom:var(--s3)">
            <img src="${capturedPhoto}" class="photo-thumb" alt="Captured question" />
            <div style="flex:1;min-width:0">
              <button class="btn small" id="retakeBtn" style="margin-bottom:var(--s2)">📷 Retake</button>
              ${!extractedData && !errorMsg ? `<button class="btn primary small" id="extractBtn">🔍 Read question</button>` : ''}
            </div>
          </div>
      `;

      if (extractedData) {
        html += `
          <div style="border-top:1px solid var(--border);padding-top:var(--s3)">
            <div class="field">
              <label>Question</label>
              <textarea class="input" id="editQ" rows="3">${escapeHtml(extractedData.question)}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
              <div class="field">
                <label>Your answer (wrong)</label>
                <input class="input" id="editYour" value="${escapeAttr(extractedData.yourAnswer)}" />
              </div>
              <div class="field">
                <label>Correct answer</label>
                <input class="input" id="editCorrect" value="${escapeAttr(extractedData.correctAnswer)}" />
              </div>
            </div>
            <div class="field">
              <label>Topic</label>
              <input class="input" id="editTopic" value="${escapeAttr(extractedData.topic)}" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
              <div class="field">
                <label>Why you missed it</label>
                <select class="input" id="editCat">
                  ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Quick note</label>
                <input class="input" id="editWhy" placeholder="e.g. forgot the formula" />
              </div>
            </div>
            <button class="btn primary" style="width:100%;margin-top:var(--s3)" id="saveEntryBtn">
              Save to Error Log
            </button>
          </div>
        `;
      }

      html += `</div>`;
    }

    // Just-saved feedback
    if (lastSaved) {
      html += `
        <div class="card" style="border-color:var(--success);margin-top:var(--s3);background:var(--success-soft)">
          <div style="display:flex;align-items:center;gap:var(--s2)">
            <span style="color:var(--success);font-size:var(--t-xl)">✓</span>
            <div>
              <div style="font-weight:700;color:var(--success)">Saved!</div>
              <div style="font-size:var(--t-sm);color:var(--muted)">${escapeHtml(lastSaved)}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Quick stats
    const store = getStore();
    const today = new Date().toDateString();
    const todayCount = store.entries.filter(e => new Date(e.date).toDateString() === today).length;
    html += `
      <div class="card-sm" style="margin-top:var(--s3);display:flex;justify-content:space-around;text-align:center">
        <div><div style="font-weight:800;font-size:var(--t-lg)">${store.entries.length}</div><div style="font-size:var(--t-xs);color:var(--faint)">Total</div></div>
        <div><div style="font-weight:800;font-size:var(--t-lg)">${todayCount}</div><div style="font-size:var(--t-xs);color:var(--faint)">Today</div></div>
        <div><div style="font-weight:800;font-size:var(--t-lg);color:var(--primary)">${getStore().entries.filter(e => e.fsrs && new Date(e.fsrs.due) <= new Date()).length}</div><div style="font-size:var(--t-xs);color:var(--faint)">Due</div></div>
      </div>
    `;

    wrap.innerHTML = html;

    // Wire event handlers
    wireHandlers(wrap);
  }

  function wireHandlers(w) {
    // Capture zone click → trigger file input
    const zone = w.querySelector('#captureZone');
    const fileInput = w.querySelector('#photoInput');
    if (zone && fileInput) {
      zone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileSelect);
    }

    // Retake button
    const retakeBtn = w.querySelector('#retakeBtn');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        capturedPhoto = null;
        extractedData = null;
        errorMsg = null;
        render();
      });
    }

    // Extract button
    const extractBtn = w.querySelector('#extractBtn');
    if (extractBtn) {
      extractBtn.addEventListener('click', runExtraction);
    }

    // Retry button
    const retryBtn = w.querySelector('#retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        errorMsg = null;
        runExtraction();
      });
    }

    // Save button
    const saveBtn = w.querySelector('#saveEntryBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const q = w.querySelector('#editQ')?.value || '';
        const your = w.querySelector('#editYour')?.value || '';
        const correct = w.querySelector('#editCorrect')?.value || '';
        const topic = w.querySelector('#editTopic')?.value || '';
        const cat = w.querySelector('#editCat')?.value || 'understanding';
        const why = w.querySelector('#editWhy')?.value || '';

        if (!q.trim()) {
          alert('Question text is required.');
          return;
        }

        addEntry({
          topic: topic.trim(),
          question: q.trim(),
          yourAnswer: your.trim(),
          correctAnswer: correct.trim(),
          category: cat,
          why: why.trim()
        });

        lastSaved = topic || 'Question logged';
        capturedPhoto = null;
        extractedData = null;
        errorMsg = null;

        // Clear lastSaved after 3 seconds
        setTimeout(() => { lastSaved = null; render(); }, 3000);

        window.__errorlabToast('Logged ✓');
        render();
      });
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Convert to base64 data URL
    const reader = new FileReader();
    reader.onload = (ev) => {
      capturedPhoto = ev.target.result;
      extractedData = null;
      errorMsg = null;
      render();
    };
    reader.readAsDataURL(file);
  }

  async function runExtraction() {
    if (!capturedPhoto) return;
    processing = true;
    errorMsg = null;
    render();

    try {
      extractedData = await extractFromPhoto(capturedPhoto);
      processing = false;
      render();
    } catch (err) {
      processing = false;
      errorMsg = err.message;
      render();
    }
  }

  render();
  return wrap;
}

// (all imports at top of file)
