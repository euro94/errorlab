/* ErrorLab — store.js v3: full AICPA FAR content taxonomy */
import { fsrs, createEmptyCard, Rating, generatorParameters } from './fsrs.js';

/* ---- Axis enums ---- */
export const OUTCOMES = {
  mastered:      { label: 'Mastered',      desc: 'Right + Confident',          icon: '✓' },
  fragile:       { label: 'Fragile',       desc: 'Right + Unsure',             icon: '⚡' },
  honest_gap:    { label: 'Honest Gap',    desc: 'Wrong + Unsure',             icon: '📖' },
  misconception: { label: 'Misconception', desc: 'Wrong + Confident — PRIORITY',icon: '⚠' }
};

export const FAILURE_REASONS = {
  conceptual:    { label: 'Conceptual',        short: 'concept' },
  application:   { label: 'Application',       short: 'apply' },
  computational: { label: 'Computational',     short: 'calc' },
  misread:       { label: 'Misread',           short: 'read' },
  trap:          { label: 'Fell for trap',     short: 'trap' },
  pacing:        { label: 'Pacing / Rushed',   short: 'pace' },
  incomplete:    { label: 'Incomplete knowledge', short: 'partial' },
  stale:         { label: 'Stale / Decayed',   short: 'decay' }
};

export const SKILL_LEVELS = {
  remembering: { label: 'Remembering & Understanding', short: 'L1' },
  application: { label: 'Application',                 short: 'L2' },
  analysis:    { label: 'Analysis',                    short: 'L3' }
};

// Full AICPA FAR Blueprint content areas
export const FAR_NODES = [
  { key: 'area1_conceptual', label: 'AREA I — Financial Reporting', nodes: [
    { key: 'conceptual_framework', label: 'Conceptual framework & general standards', nodes: [
      { key: 'cf_elements', label: 'Conceptual framework (elements, qualitative characteristics, recognition/measurement)' },
      { key: 'going_concern', label: 'Going concern' },
      { key: 'ratios_fsa', label: 'Ratios & financial-statement analysis' },
    ]},
    { key: 'for_profit_gp', label: 'For-profit general-purpose statements', nodes: [
      { key: 'balance_sheet', label: 'Balance sheet / classification' },
      { key: 'income_statement', label: 'Income statement & discontinued operations' },
      { key: 'oci', label: 'Comprehensive income / OCI' },
      { key: 'statement_equity', label: 'Statement of changes in equity' },
      { key: 'cash_flows', label: 'Statement of cash flows (direct/indirect, classification)' },
      { key: 'notes_disclosures', label: 'Notes & disclosures (risks/uncertainties, related parties, subsequent events)' },
      { key: 'segment_reporting', label: 'Segment reporting' },
      { key: 'interim_reporting', label: 'Interim reporting' },
    ]},
    { key: 'other_frameworks', label: 'Other reporting frameworks & entities', nodes: [
      { key: 'nfp_reporting', label: 'Not-for-profit (statement of activities, net asset classes, contributions, pledges)' },
      { key: 'special_purpose', label: 'Special-purpose frameworks (cash, modified cash, tax basis)' },
      { key: 'sec_reporting', label: 'SEC reporting (10-K, 10-Q, forms, public vs. nonpublic)' },
    ]},
    { key: 'slg', label: 'State & local government', nodes: [
      { key: 'slg_measurement', label: 'Measurement focus / basis of accounting (modified accrual vs. accrual)' },
      { key: 'slg_fund_types', label: 'Fund types (governmental, proprietary, fiduciary)' },
      { key: 'slg_fund_fs', label: 'Fund financial statements' },
      { key: 'slg_gw_fs', label: 'Government-wide statements' },
      { key: 'slg_reconciliation', label: 'Fund-to-government-wide reconciliation' },
      { key: 'slg_budgetary', label: 'Budgetary accounting & encumbrances' },
      { key: 'slg_net_position', label: 'Net position / fund balance classification' },
      { key: 'slg_mda_rsi', label: 'MD&A and RSI' },
    ]},
  ]},
  { key: 'area2_bs', label: 'AREA II — Select Balance Sheet Accounts', nodes: [
    { key: 'cash', label: 'Cash & cash equivalents' },
    { key: 'receivables', label: 'Trade receivables (allowance, write-offs, factoring/pledging)' },
    { key: 'inventory_costing', label: 'Inventory — costing (FIFO/LIFO/weighted-avg)' },
    { key: 'inventory_valuation', label: 'Inventory — valuation (LCM/LCNRV, retail, gross-profit)' },
    { key: 'ppe_capitalize', label: 'PP&E — capitalization & interest' },
    { key: 'ppe_depreciation', label: 'PP&E — depreciation methods' },
    { key: 'ppe_impairment', label: 'PP&E — impairment & disposal' },
    { key: 'investments_debt', label: 'Investments — debt securities (HTM/AFS/trading)' },
    { key: 'investments_equity', label: 'Investments — equity securities & equity method' },
    { key: 'intangibles', label: 'Intangibles — finite/indefinite, amortization' },
    { key: 'goodwill', label: 'Goodwill & impairment' },
    { key: 'payables', label: 'Payables & accrued liabilities' },
    { key: 'debt_bonds', label: 'Debt — bonds & effective-interest' },
    { key: 'debt_modification', label: 'Debt — issuance costs, modification/extinguishment, TDR (ASC 470)' },
    { key: 'equity_stock', label: 'Equity — common/preferred stock' },
    { key: 'equity_treasury', label: 'Equity — treasury stock' },
    { key: 'equity_dividends', label: 'Equity — dividends, splits, retained earnings' },
  ]},
  { key: 'area3_transactions', label: 'AREA III — Select Transactions', nodes: [
    { key: 'revenue_606', label: 'Revenue recognition (ASC 606, 5-step, contract costs, % completion)' },
    { key: 'leases_lessee', label: 'Leases (ASC 842 — lessee)' },
    { key: 'leases_lessor', label: 'Leases (ASC 842 — lessor)' },
    { key: 'income_taxes', label: 'Income taxes (ASC 740, deferred tax assets/liabilities, valuation allowance)' },
    { key: 'business_combos', label: 'Business combinations' },
    { key: 'consolidations', label: 'Consolidations (NCI, intercompany eliminations)' },
    { key: 'acct_changes', label: 'Accounting changes & error corrections' },
    { key: 'contingencies', label: 'Contingencies & commitments' },
    { key: 'fair_value', label: 'Fair value measurement (ASC 820)' },
    { key: 'fx', label: 'Foreign currency (transactions & translation)' },
    { key: 'nonmonetary', label: 'Nonmonetary exchanges' },
    { key: 'subsequent_events', label: 'Subsequent events' },
    { key: 'stock_comp', label: 'Stock compensation (ASC 718)' },
    { key: 'pensions', label: 'Employee benefits / pensions (ASC 715)' },
    { key: 'derivatives', label: 'Derivatives & hedging (ASC 815)' },
    { key: 'software_rd', label: 'Software & R&D costs' },
    { key: 'nfp_transactions', label: 'Not-for-profit transactions (contributions, split-interest agreements)' },
  ]},
];

// Flatten for lookups
function flattenNodes(nodes, prefix = '') {
  const result = [];
  nodes.forEach(n => {
    const key = prefix ? prefix + '.' + n.key : n.key;
    result.push({ key: n.key, fullKey: key, label: n.label, area: prefix.split('.')[0] || n.key });
    if (n.nodes) result.push(...flattenNodes(n.nodes, key));
  });
  return result;
}
export const FAR_NODES_FLAT = flattenNodes(FAR_NODES);

/* ---- Store ---- */
const STORE_KEY = 'errorlab_v2';
const f = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false }));

export function freshStore() {
  return { entries: [], settings: { theme: 'light' } };
}

let store = freshStore();

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.entries) parsed.entries.forEach(e => {
        if (e.fsrs) {
          if (e.fsrs.due) e.fsrs.due = new Date(e.fsrs.due);
          if (e.fsrs.last_review) e.fsrs.last_review = new Date(e.fsrs.last_review);
        }
      });
      store = { ...freshStore(), ...parsed, settings: { ...freshStore().settings, ...parsed.settings } };
    }
  } catch (e) { console.error('loadStore failed', e); }
  return store;
}

export function persist(s = store) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
export function getStore() { return store; }

export function createFSRSCard() { return createEmptyCard(new Date()); }
export function getRatingPreview(card) {
  const sched = f.repeat(card, new Date());
  const fmt = d => { const ms = new Date(d) - Date.now(); const m = Math.round(ms / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.round(m / 60); if (h < 24) return `${h}h`; return `${Math.round(h / 24)}d`; };
  return { [Rating.Again]: { label: 'Again', due: fmt(sched[Rating.Again].card.due), card: sched[Rating.Again].card }, [Rating.Hard]: { label: 'Hard', due: fmt(sched[Rating.Hard].card.due), card: sched[Rating.Hard].card }, [Rating.Good]: { label: 'Good', due: fmt(sched[Rating.Good].card.due), card: sched[Rating.Good].card }, [Rating.Easy]: { label: 'Easy', due: fmt(sched[Rating.Easy].card.due), card: sched[Rating.Easy].card }, sched };
}

export function applyRating(entry, rating) {
  const sched = f.repeat(entry.fsrs, new Date());
  entry.fsrs = sched[rating].card;
  entry.reps = (entry.reps || 0) + 1;
  if (rating === Rating.Again) entry.lapses = (entry.lapses || 0) + 1;
}

export function addEntry(data) {
  const entry = {
    id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    date: new Date().toISOString(),
    section: data.section || '',
    module: data.module || '',
    question: data.question || '',
    yourAnswer: data.yourAnswer || '',
    correctAnswer: data.correctAnswer || '',
    outcome: data.outcome || 'honest_gap',
    failureReason: data.failureReason || 'conceptual',
    skillLevel: data.skillLevel || 'application',
    farNode: data.farNode || '',
    farSubNode: data.farSubNode || '',
    confidence: data.confidence || 3,
    timePerQ: data.timePerQ || 0,
    firstExposure: !!data.firstExposure,
    remediation: 'untouched',
    fsrs: createFSRSCard(),
    reps: 0,
    lapses: 0
  };
  store.entries.push(entry);
  persist();
  return entry;
}

export function deleteEntry(id) { store.entries = store.entries.filter(e => e.id !== id); persist(); }

export function getDueEntries() {
  const now = new Date();
  return store.entries.filter(e => e.fsrs && new Date(e.fsrs.due) <= now).sort((a, b) => new Date(a.fsrs.due) - new Date(b.fsrs.due));
}

export function getCategoryStats() {
  const cats = {};
  store.entries.forEach(e => { const c = e.outcome || 'honest_gap'; cats[c] = (cats[c] || 0) + 1; });
  return cats;
}

export function getWeeklyLogs() {
  const weekAgo = Date.now() - 7 * 86400000;
  return store.entries.filter(e => { try { return new Date(e.date).getTime() > weekAgo; } catch(_) { return false; } });
}
