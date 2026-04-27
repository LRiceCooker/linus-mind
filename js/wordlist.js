// English word list — loaded lazily from data/words.txt (370k words from dwyl/english-words)
// The Set is populated on first access via loadWordList(). Until then, checks return false
// (words are treated as candidates), which is fine since Wikipedia API will filter them.

export let COMMON_WORDS = new Set();

let loaded = false;
let loading = null;

export async function loadWordList() {
  if (loaded) return;
  if (loading) return loading;

  loading = (async () => {
    try {
      const res = await fetch('data/words.txt');
      if (!res.ok) throw new Error(`Failed to load word list: ${res.status}`);
      const text = await res.text();
      const words = text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
      COMMON_WORDS = new Set(words);
      loaded = true;
    } catch (e) {
      console.warn('Could not load word list, Wikipedia linking will be less precise:', e.message);
      loaded = true; // Don't retry on failure
    }
  })();

  return loading;
}

export function isWordListLoaded() {
  return loaded;
}
