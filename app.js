/* ErrorLab — app.js: router, theme, boot */
import { loadStore, getStore, setStore, persist } from './store.js';
import { hasApiKey, setApiKey } from './openai.js';
import { renderLog } from './views/log.js';
import { renderErrors } from './views/errors.js';
import { renderRetest } from './views/retest.js';
import { renderMini } from './views/mini.js';
import { renderDashboard } from './views/dashboard.js';

/* ---- Init ---- */
loadStore();
const root = document.getElementById('root');

/* ---- Router ---- */
const ROUTES = ['log', 'errors', 'retest', 'mini', 'dashboard'];

function currentRoute() {
  const h = location.hash.replace('#/', '');
  return ROUTES.includes(h) ? h : 'log';
}

function setActiveNav(route) {
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

function render() {
  loadStore(); // refresh from localStorage each render
  const route = currentRoute();
  const store = getStore();
  document.documentElement.setAttribute('data-theme', store.settings.theme);
  setActiveNav(route);

  let view;
  switch (route) {
    case 'log':
      view = renderLog();
      break;
    case 'errors':
      view = renderErrors();
      break;
    case 'retest':
      view = renderRetest();
      break;
    case 'mini':
      view = renderMini(() => render());
      break;
    case 'dashboard':
      view = renderDashboard();
      break;
    default:
      view = renderLog(() => render());
  }

  root.innerHTML = '';
  root.appendChild(view);
}

/* ---- Theme toggle ---- */
window.__errorlabToggleTheme = () => {
  const store = getStore();
  store.settings.theme = store.settings.theme === 'dark' ? 'light' : 'dark';
  persist(store);
  render();
};

/* ---- Toast ---- */
let toastTimer = null;
window.__errorlabToast = (msg) => {
  let t = document.getElementById('errorlab-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.id = 'errorlab-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
};

/* ---- Hash change handler ---- */
window.addEventListener('hashchange', () => render());

/* ---- Keyboard shortcuts ---- */
document.addEventListener('keydown', (e) => {
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  const route = currentRoute();
  if (route === 'retest' || route === 'mini') {
    if (e.key === 'Enter') {
      const revealBtn = document.getElementById('revealBtn') || document.getElementById('showBtn');
      if (revealBtn) revealBtn.click();
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const btns = document.querySelectorAll('.rt-rating button');
      const idx = +e.key - 1;
      if (btns[idx]) btns[idx].click();
    }
  }
});

/* ---- Boot ---- */
render();

/* ---- Restore hash on load ---- */
if (!location.hash) location.hash = '#/log';

/* ---- Key indicator + settings ---- */
function updateKeyIndicator() {
  const dot = document.getElementById('keyIndicator');
  if (dot) dot.style.display = hasApiKey() ? 'inline-block' : 'none';
}
document.getElementById('settingsBtn').addEventListener('click', () => {
  const hasKey = hasApiKey();
  const msg = hasKey
    ? 'OpenAI API key is saved in this browser.\n\nEnter a new key (or leave blank to keep current):'
    : 'Enter your OpenAI API key (starts with sk-):';
  const key = prompt(msg);
  if (key === null) return; // cancelled
  if (key === '' && hasKey) return; // kept current
  if (key && key.startsWith('sk-')) {
    setApiKey(key);
    updateKeyIndicator();
    window.__errorlabToast('API key saved');
    render();
  } else if (key) {
    alert('Enter a valid OpenAI API key (starts with sk-)');
  }
});
updateKeyIndicator();
