/* ErrorLab — store.js: data model, FSRS engine, persistence */
import { fsrs, createEmptyCard, Rating, generatorParameters } from './fsrs.js';

export const CATEGORIES = {
  reading:      { label: 'Reading error', short: 'reading' },
  misinterpret: { label: 'Misinterpreted', short: 'misinterpret' },
  calc:         { label: 'Calculation', short: 'calc' },
  understanding:{ label: "Didn't understand", short: 'understanding' }
};

const STORE_KEY = 'errorlab_v1';

export function freshStore() {
  return { entries: [], settings: { theme: 'light' } };
}

let store = freshStore();

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // revive dates in FSRS cards
      if (parsed.entries) {
        parsed.entries.forEach(e => {
          if (e.fsrs) {
            if (e.fsrs.due) e.fsrs.due = new Date(e.fsrs.due);
            if (e.fsrs.last_review) e.fsrs.last_review = new Date(e.fsrs.last_review);
          }
        });
      }
      store = { ...freshStore(), ...parsed, settings: { ...freshStore().settings, ...parsed.settings } };
    }
  } catch (e) { console.error('Failed to load store', e); }
  return store;
}

export function persist(s = store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
  catch (e) { console.error('Persist failed', e); }
}

export function getStore() { return store; }
export function setStore(s) { store = s; }

/* ---- FSRS engine ---- */
const f = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false }));

export function createFSRSCard() {
  return createEmptyCard(new Date());
}

export function getRatingPreview(card) {
  const sched = f.repeat(card, new Date());
  const fmt = (d) => {
    const ms = new Date(d) - Date.now();
    const mins = Math.round(ms / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days}d`;
    const months = Math.round(days / 30);
    return `${months}mo`;
  };
  return {
    [Rating.Again]: { label: 'Again', due: fmt(sched[Rating.Again].card.due), card: sched[Rating.Again].card, rating: Rating.Again },
    [Rating.Hard]:  { label: 'Hard',  due: fmt(sched[Rating.Hard].card.due),  card: sched[Rating.Hard].card,  rating: Rating.Hard },
    [Rating.Good]:  { label: 'Good',  due: fmt(sched[Rating.Good].card.due),  card: sched[Rating.Good].card,  rating: Rating.Good },
    [Rating.Easy]:  { label: 'Easy',  due: fmt(sched[Rating.Easy].card.due),  card: sched[Rating.Easy].card,  rating: Rating.Easy },
    sched
  };
}

export function applyRating(entry, rating) {
  const sched = f.repeat(entry.fsrs, new Date());
  entry.fsrs = sched[rating].card;
  entry.reps = (entry.reps || 0) + 1;
  if (rating === Rating.Again) entry.lapses = (entry.lapses || 0) + 1;
}

/* ---- Entry CRUD ---- */
export function addEntry(data) {
  const entry = {
    id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    date: new Date().toISOString(),
    topic: data.topic || '',
    question: data.question || '',
    yourAnswer: data.yourAnswer || '',
    correctAnswer: data.correctAnswer || '',
    category: data.category || 'understanding',
    why: data.why || '',
    fsrs: createFSRSCard(),
    reps: 0,
    lapses: 0
  };
  store.entries.push(entry);
  persist();
  return entry;
}

export function deleteEntry(id) {
  store.entries = store.entries.filter(e => e.id !== id);
  persist();
}

export function getDueEntries() {
  const now = new Date();
  return store.entries
    .filter(e => e.fsrs && new Date(e.fsrs.due) <= now)
    .sort((a, b) => new Date(a.fsrs.due) - new Date(b.fsrs.due));
}

export function getCategoryStats() {
  const counts = { reading: 0, misinterpret: 0, calc: 0, understanding: 0 };
  store.entries.forEach(e => {
    if (counts[e.category] !== undefined) counts[e.category]++;
  });
  return counts;
}

export function getWeeklyLogs() {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  return store.entries.filter(e => new Date(e.date).getTime() > weekAgo);
}
