import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, initialState } from '../js/story.js';
import { CHAPTERS } from '../js/chapters.js';

const run = (s, evs) => evs.reduce((a, [e, p]) => advance(a, e, p), s);
const life = (c, o) => [['touch', c], ['takeItem'], ['deliver'], ['choose', o], ['outcomeDone'], ['act'], ['collect']];

for (const [ch, data] of Object.entries(CHAPTERS)) {
  test(`${ch}: üç karakter ve tam içerik`, () => {
    assert.equal(Object.keys(data.characters).length, 3);
    for (const c of Object.values(data.characters)) {
      for (const k of ['label', 'wake', 'carry', 'prompt', 'history']) assert.ok(c[k], k);
      assert.equal(Object.keys(c.options).length, 2);
      for (const o of Object.values(c.options)) for (const k of ['label', 'result', 'memory', 'finale']) assert.ok(o[k], k);
    }
  });
  for (const [c, cd] of Object.entries(data.characters)) for (const o of Object.keys(cd.options)) {
    test(`${ch}/${c}/${o} bölümü müzede biter`, () => {
      const s = run(initialState(), [['door', ch], ...life(c, o)]);
      assert.equal(s.stage, 'museum'); assert.equal(s.done[ch][c], o);
    });
  }
  test(`${ch}: üçü bitince ortak final açılır ve kayıtlar korunur`, () => {
    const cs = Object.entries(data.characters); let s = initialState();
    cs.forEach(([c, d], i) => {
      s = run(s, [['door', ch], ...life(c, Object.keys(d.options)[0])]);
      assert.equal(s.stage, i === 2 ? 'finale' : 'museum');
    });
    s = advance(s, 'finish'); assert.equal(s.stage, 'museum'); assert.equal(Object.keys(s.done[ch]).length, 3);
  });
}
test('adımlar atlanamaz, geçersiz girdiler yok sayılır', () => {
  let s = initialState();
  assert.equal(advance(s, 'door', 'yok').stage, 'museum'); assert.equal(advance(s, 'act').stage, 'museum');
  s = advance(s, 'door', 'paris'); assert.equal(advance(s, 'deliver').stage, 'traveller'); assert.equal(advance(s, 'touch', 'topcu').stage, 'traveller');
  s = run(s, [['touch', 'asker'], ['takeItem'], ['deliver']]); assert.equal(advance(s, 'choose', 'yusuf').stage, 'choice');
});
test('dinleme yalnızca zaman yolcusuyken ve bir kez sayılır', () => {
  assert.deepEqual(advance(initialState(), 'listen', 'a').listened, []);
  assert.deepEqual(run(initialState(), [['door', 'paris'], ['listen', 'a'], ['listen', 'a']]).listened, ['a']);
});
test('müzeye dönüp yeni karakter seçilebilir, önceki seçim kalır', () => {
  const s = run(initialState(), [['door', 'istanbul'], ...life('topcu', 'usta'), ['door', 'istanbul']]);
  assert.equal(s.stage, 'traveller'); assert.equal(s.done.istanbul.topcu, 'usta');
});
