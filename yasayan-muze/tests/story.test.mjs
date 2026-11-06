import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, initialState, CHOICES } from '../js/story.js';

const run = (s, evs) => evs.reduce((a, [e, p]) => advance(a, e, p), s);
const path = c => [['doorIstanbul'], ['touchSoldier'], ['takeWad'], ['deliverWad'], ['choose', c], ['outcomeDone'], ['fire'], ['returnToMuseum']];

for (const c of Object.keys(CHOICES)) {
  test(`${c} seçimiyle bölüm müzede biter ve nesne kalır`, () => {
    const s = run(initialState(), path(c));
    assert.equal(s.stage, 'museum');
    assert.deepEqual(s.trophy, { id: 'harita-1453', choice: c });
  });
}
test('adımlar atlanamaz', () => {
  assert.equal(advance(initialState(), 'fire').stage, 'museum');
  assert.equal(run(initialState(), [['doorIstanbul'], ['deliverWad']]).stage, 'traveller');
});
test('geçersiz seçim yok sayılır', () => {
  const s = run(initialState(), path('yusuf').slice(0, 4));
  assert.equal(advance(s, 'choose', 'yok').stage, 'choice');
});
test('dinleme yalnızca zaman yolcusuyken ve bir kez sayılır', () => {
  let s = advance(initialState(), 'listen', 'a');
  assert.deepEqual(s.listened, []);
  s = run(initialState(), [['doorIstanbul'], ['listen', 'a'], ['listen', 'a']]);
  assert.deepEqual(s.listened, ['a']);
});
test('seçimler kişisel sonucu değiştirir, tarihi değiştiren alan yoktur', () => {
  const end = c => run(initialState(), path(c));
  const { trophy: a, ...ra } = end('yusuf'), { trophy: b, ...rb } = end('usta');
  assert.deepEqual(ra, rb); assert.equal(a.id, b.id);
});
