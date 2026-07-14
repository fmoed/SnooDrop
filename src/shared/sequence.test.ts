import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, generateDailySequence } from './sequence.ts';

test('mulberry32 is deterministic for the same seed', () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 10; i++) {
    assert.equal(a(), b());
  }
});

test('generateDailySequence returns `count` tiers in range 1-4', () => {
  const seq = generateDailySequence(20260701, 500);
  assert.equal(seq.length, 500);
  for (const tier of seq) {
    assert.ok(tier >= 1 && tier <= 4, `tier out of range: ${tier}`);
  }
});

test('generateDailySequence is deterministic for a given seed', () => {
  const a = generateDailySequence(20260701);
  const b = generateDailySequence(20260701);
  assert.deepEqual(a, b);
});

test('different seeds produce different sequences', () => {
  const a = generateDailySequence(1);
  const b = generateDailySequence(2);
  assert.notDeepEqual(a, b);
});
