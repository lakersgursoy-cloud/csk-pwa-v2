// Bölüm akışı: saf mantık, Three.js'e bağlı değil. tests/story.test.mjs ile sınanır.
// Tarihsel sonuç sabittir; oyuncunun seçimi yalnızca kişisel hikâyeyi değiştirir.

export const CHOICES = {
  yusuf: {
    label: "Yusuf'un elini sar",
    result: "Usta sana bağırdı. Ama Yusuf o geceden sonra adını hiç unutmadı.",
    memory: "Yusuf'un yanık elini sardığın an.",
  },
  usta: {
    label: 'Ustanın yanında kal',
    result: 'Usta başını salladı. Yusuf ise o geceden sonra seninle hiç konuşmadı.',
    memory: 'Ateş emrini ustanın yanında beklediğin an.',
  },
};

export const initialState = () => ({ stage: 'museum', choice: null, listened: [], trophy: null });

const TRANSITIONS = {
  museum: { doorIstanbul: 'traveller' },
  traveller: { touchSoldier: 'wakeInCamp' },
  wakeInCamp: { takeWad: 'carryWad' },
  carryWad: { deliverWad: 'choice' },
  outcome: { outcomeDone: 'cannon' },
  cannon: { fire: 'aftermath' },
  aftermath: { returnToMuseum: 'museum' },
};

export function advance(state, event, payload) {
  if (event === 'listen' && state.stage === 'traveller') {
    if (state.listened.includes(payload)) return state;
    return { ...state, listened: [...state.listened, payload] };
  }
  if (state.stage === 'choice' && event === 'choose') {
    if (!CHOICES[payload]) return state;
    return { ...state, stage: 'outcome', choice: payload };
  }
  const stage = TRANSITIONS[state.stage]?.[event];
  if (!stage) return state;
  const next = { ...state, stage };
  if (event === 'returnToMuseum') {
    next.trophy = { id: 'harita-1453', choice: state.choice };
    next.choice = null;
    next.listened = [];
  }
  return next;
}
