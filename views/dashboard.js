/* ErrorLab — views/dashboard.js: stats & pattern tracking */
import { getStore, getCategoryStats, getWeeklyLogs } from '../store.js';

const CAT_COLORS = {
  reading:      'var(--cat-reading)',
  misinterpret: 'var(--cat-misinterpret)',
  calc:         'var(--cat-calc)',
  understanding:'var(--cat-understanding)'
};

const CAT_LABELS = {
  reading:      'Reading',
  misinterpret: 'Misinterpret',
  calc:         'Calculation',
  understanding:'Understanding'
};

export function renderDashboard() {
  const store = getStore();
  const catCounts = getCategoryStats();
  const weekly = getWeeklyLogs();
  const total = store.entries.length;

  // Find dominant category
  let dominant = null, domCount = 0;
  Object.entries(catCounts).forEach(([k, v]) => {
    if (v > domCount) { dominant = k; domCount = v; }
  });

  // Recent trend: entries per day this week
  const now = Date.now();
  const dayMap = {};
  for (let i = 0; i < 7; i++) {
    const day = new Date(now - i * 86400000);
    const key = `${day.getMonth()+1}/${day.getDate()}`;
    dayMap[key] = 0;
  }
  weekly.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getMonth()+1}/${d.getDate()}`;
    if (dayMap[key] !== undefined) dayMap[key]++;
  });
  const dayKeys = Object.keys(dayMap).reverse();
  const maxDay = Math.max(1, ...Object.values(dayMap));

  // Total reviews
  const totalReviews = store.entries.reduce((s, e) => s + (e.reps || 0), 0);
  const totalLapses = store.entries.reduce((s, e) => s + (e.lapses || 0), 0);
  const retentionRate = totalReviews > 0 ? Math.round(((totalReviews - totalLapses) / totalReviews) * 100) : '—';

  // Due now
  const nowDate = new Date();
  const dueNow = store.entries.filter(e => e.fsrs && new Date(e.fsrs.due) <= nowDate).length;

  const wrap = document.createElement('div');
  wrap.className = 'fade-in';
  wrap.innerHTML = `
    <div class="section-head">Dashboard</div>

    <!-- Key metrics -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-val" style="color:var(--primary)">${total}</div>
        <div class="stat-label">Total Errors</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:${dueNow > 0 ? 'var(--danger)' : 'var(--success)'}">${dueNow}</div>
        <div class="stat-label">Due for Re-Test</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${totalReviews}</div>
        <div class="stat-label">Total Reviews</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${retentionRate}${retentionRate !== '—' ? '%' : ''}</div>
        <div class="stat-label">Retention Rate</div>
      </div>
    </div>
  `;

  // Category breakdown
  if (total > 0) {
    const catSection = document.createElement('div');
    catSection.innerHTML = `
      <div class="section-title">Error Categories</div>
      ${Object.entries(catCounts).map(([k, v]) => `
        <div class="cat-bar">
          <span class="cat-name" style="color:${CAT_COLORS[k]}">${CAT_LABELS[k]}</span>
          <div class="cat-track">
            <div class="cat-fill" style="width:${total > 0 ? Math.round((v/total)*100) : 0}%;background:${CAT_COLORS[k]};min-width:${v > 0 ? '24px' : '0'}">${v > 0 ? v : ''}</div>
          </div>
        </div>
      `).join('')}
    `;
    catSection.querySelectorAll('.cat-fill').forEach(fill => {
      if (fill.textContent) fill.style.color = '#fff';
    });
    wrap.appendChild(catSection);
  }

  // Weekly trend sparkline
  if (weekly.length > 0 || total > 0) {
    const trendSection = document.createElement('div');
    trendSection.innerHTML = `
      <div class="section-title" style="margin-top:var(--s4)">This Week's Activity</div>
      <div class="card-sm" style="display:flex;align-items:flex-end;gap:var(--s1);height:80px;padding:var(--s3)">
        ${dayKeys.map(day => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
            <div style="width:100%;background:var(--primary);border-radius:var(--r-sm) var(--r-sm) 0 0;height:${dayMap[day] > 0 ? Math.max(4, Math.round((dayMap[day]/maxDay)*60)) : 0}px;transition:height 300ms var(--ease);min-height:${dayMap[day] > 0 ? '4px' : '0'}"></div>
            <span style="font-size:10px;color:var(--faint);font-family:var(--mono)">${day}</span>
          </div>
        `).join('')}
      </div>
    `;
    wrap.appendChild(trendSection);
  }

  // Pattern alert
  if (dominant && domCount > 0 && domCount / total >= 0.35 && total >= 5) {
    const alertEl = document.createElement('div');
    alertEl.className = 'alert warning';
    alertEl.innerHTML = `<span>&#9888;</span> <span><strong>Recurring pattern:</strong> "${CAT_LABELS[dominant]}" represents ${Math.round((domCount/total)*100)}% of your errors. Target this weakness directly — revisit the topic in Becker before drilling more questions.</span>`;
    wrap.querySelector('.section-head').after(alertEl);
  }

  if (total === 0) {
    wrap.innerHTML += `
      <div class="state">
        <div class="big">📊</div>
        <h2>No data yet</h2>
        <p>Start logging errors in the <strong>Log</strong> tab to see your stats and patterns here.</p>
      </div>
    `;
  }

  return wrap;
}
