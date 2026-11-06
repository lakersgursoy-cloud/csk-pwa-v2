// Bölüm akışı: saf mantık, Three.js'e bağlı değil. tests/story.test.mjs ile sınanır.
// Tarihsel sonuç sabittir; oyuncunun seçimi yalnızca kişisel hikâyeyi değiştirir.
import { CHAPTERS } from './chapters.js';

export const initialState = () => ({ stage: 'museum', chapter: null, character: null, choice: null, listened: [], done: {} });
export const currentCharacter = (s) => CHAPTERS[s.chapter]?.characters[s.character] ?? null;

const NEXT = {
  wake: { takeItem: 'carry' }, carry: { deliver: 'choice' }, outcome: { outcomeDone: 'climax' },
  climax: { act: 'aftermath' }, finale: { finish: 'museum' },
};

export function advance(state, event, payload) {
  const { stage } = state;
  if (stage === 'museum' && event === 'door') {
    if (!CHAPTERS[payload]) return state;
    return { ...state, stage: 'traveller', chapter: payload, character: null, choice: null, listened: [] };
  }
  if (stage === 'traveller' && event === 'listen') {
    return state.listened.includes(payload) ? state : { ...state, listened: [...state.listened, payload] };
  }
  if (stage === 'traveller' && event === 'watch' && CHAPTERS[state.chapter].spectacle) return { ...state, stage: 'spectacle', character: null, choice: null };
  if (stage === 'traveller' && event === 'climb' && CHAPTERS[state.chapter].assault) return { ...state, stage: 'assault', character: null, choice: null };
  if (stage === 'assault' && event === 'climbDone') return { ...state, stage: 'museum' };
  if (stage === 'spectacle' && event === 'watchDone') return { ...state, stage: 'museum' };
  if (stage === 'traveller' && event === 'touch') {
    if (!CHAPTERS[state.chapter].characters[payload]) return state;
    return { ...state, stage: 'wake', character: payload, choice: null };
  }
  if (stage === 'choice' && event === 'choose') {
    if (!currentCharacter(state).options[payload]) return state;
    return { ...state, stage: 'outcome', choice: payload };
  }
  if (stage === 'aftermath' && event === 'collect') {
    const done = { ...state.done, [state.chapter]: { ...state.done[state.chapter], [state.character]: state.choice } };
    const all = Object.keys(CHAPTERS[state.chapter].characters).every(c => done[state.chapter][c]);
    return { ...state, done, stage: all ? 'finale' : 'museum' };
  }
  const to = NEXT[stage]?.[event];
  return to ? { ...state, stage: to } : state;
}
