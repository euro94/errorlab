/* ErrorLab — views/log.js: minimal working version */
import { addEntry } from '../store.js';

let section = '', module = '';

export function renderLog() {
  const w = document.createElement('div');
  w.className = 'fade-in';
  w.innerHTML = `
    <div class="section-head">Fast Log</div>
    <div class="card-sm" style="margin-bottom:var(--s3)">
      <input class="input input-sm" id="sec" placeholder="Section (FAR)" style="margin-bottom:var(--s1);font-size:16px"/>
      <input class="input input-sm" id="mod" placeholder="Module (F3: Bonds)" style="font-size:16px"/>
    </div>
    <div class="card-sm" style="margin-bottom:var(--s3)">
      <input class="input input-sm" id="qt" placeholder="Question" style="margin-bottom:var(--s1);font-size:16px"/>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-bottom:var(--s1)">
        <input class="input input-sm" id="ya" placeholder="Your answer" style="font-size:16px"/>
        <input class="input input-sm" id="ca" placeholder="Correct answer" style="font-size:16px"/>
      </div>
      <button class="btn primary" style="width:100%" id="sv">Save</button>
    </div>
    <div id="msg" style="text-align:center;margin-top:var(--s3)"></div>
  `;

  w.querySelector('#sec').oninput = e => { section = e.target.value; };
  w.querySelector('#mod').oninput = e => { module = e.target.value; };
  w.querySelector('#sv').onclick = () => {
    const q = w.querySelector('#qt').value.trim();
    const ya = w.querySelector('#ya').value.trim();
    const ca = w.querySelector('#ca').value.trim();
    if (!q) return;
    addEntry({ section, module, question: q, yourAnswer: ya, correctAnswer: ca, outcome: 'honest_gap', failureReason: 'conceptual', skillLevel: 'application', farNode: '', confidence: 3 });
    w.querySelector('#msg').innerHTML = '<div style="color:var(--success);font-weight:700">✓ Saved</div>';
    w.querySelector('#qt').value = '';
    w.querySelector('#ya').value = '';
    w.querySelector('#ca').value = '';
    setTimeout(() => { w.querySelector('#msg').innerHTML = ''; }, 2000);
    if (window.__errorlabToast) window.__errorlabToast('Saved');
  };

  return w;
}
