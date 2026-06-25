/* ErrorLab — store.js v2: 6-axis diagnostic matrix */
import { fsrs, createEmptyCard, Rating, generatorParameters } from './fsrs.js';

/* ---- Axis enums ---- */
export const OUTCOMES = {
  mastered:     { label: 'Mastered',      desc: 'Right + Confident',          icon: '✓', color: '#2d8a56' },
  fragile:      { label: 'Fragile',       desc: 'Right + Unsure',             icon: '⚡', color: '#b3711a' },
  honest_gap:   { label: 'Honest Gap',    desc: 'Wrong + Unsure',             icon: '📖', color: '#c4413c' },
  misconception:{ label: 'Misconception', desc: 'Wrong + Confident — PRIORITY',icon: '⚠', color: '#b71c1c' }
};

export const FAILURE_REASONS = {
  conceptual:       { label: 'Conceptual',        short: 'concept' },
  application:      { label: 'Application',       short: 'apply' },
  computational:    { label: 'Computational',      short: 'calc' },
  misread:          { label: 'Misread',           short: 'read' },
  trap:             { label: 'Fell for trap',     short: 'trap' },
  pacing:           { label: 'Pacing / Rushed',   short: 'pace' },
  incomplete:       { label: 'Incomplete knowledge', short: 'partial' },
  stale:            { label: 'Stale / Decayed',   short: 'decay' }
};

export const SKILL_LEVELS = {
  remembering: { label: 'Remembering & Understanding', short: 'L1' },
  application: { label: 'Application',                 short: 'L2' },
  analysis:    { label: 'Analysis',                    short: 'L3' }
};

export const FAR_NODES = {
  conceptual_framework:  { label: 'Conceptual Framework & Reporting',  area: 'Framework' },
  fs_accounts:           { label: 'Select Financial Stmt Accounts',    area: 'Accounts' },
  select_transactions:   { label: 'Select Transactions',               area: 'Transactions' },
  state_local_gov:       { label: 'State & Local Governments',         area: 'Gov/NFP' }
};

export const REMEDIATION = {
  untouched:  { label: 'Untouched',  step: 0 },
  reviewed:   { label: 'Reviewed',   step: 1 },
  retested:   { label: 'Re-tested',  step: 2 },
  closed:     { label: 'Closed',     step: 3 }
};

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

/**
 * New entry shape (v2 6-axis):
 * {
 *   id, date, section, module,
 *   question, yourAnswer, correctAnswer,
 *   // Axis 1
 *   outcome: 'mastered'|'fragile'|'honest_gap'|'misconception',
 *   // Axis 2
 *   failureReason: 'conceptual'|'application'|'computational'|'misread'|'trap'|'pacing'|'incomplete'|'stale',
 *   // Axis 3
 *   skillLevel: 'remembering'|'application'|'analysis',
 *   // Axis 4
 *   farNode: 'conceptual_framework'|'fs_accounts'|'select_transactions'|'state_local_gov',
 *   farSubNode: '' (free text — e.g. "deferred taxes"),
 *   // Axis 5
 *   confidence: 1-5,
 *   timePerQ: number (seconds),
 *   firstExposure: boolean,
 *   // Axis 6
 *   remediation: 'untouched'|'reviewed'|'retested'|'closed',
 *   // FSRS
 *   fsrs, reps, lapses
 * }
 */
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
    farNode: data.farNode || 'select_transactions',
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
