import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRisk, severityOf, severityCounts, validateRiskInputs, RiskInputError } from '../src/algorithms/risk.ts';

const base = { cvss: 0, vulnCount: 0, majorsBehind: 0, maintenance: 1 };
test('formula: zero and maximum', () => {
  assert.equal(computeRisk(base).score, 0);
  assert.equal(computeRisk({ cvss: 10, vulnCount: 5, majorsBehind: 4, maintenance: 0 }).score, 100);
});
test('formula: hand-computed value (9.8, 4 vulns, 3 behind, .3 maintenance)', () => {
  // 50*.98=49 + 25*.8=20 + 10*.75=7.5 + 15*.7=10.5 = 87 -> 87
  const r = computeRisk({ cvss: 9.8, vulnCount: 4, majorsBehind: 3, maintenance: 0.3 });
  assert.equal(r.score, 87); assert.equal(r.severity, 'critical');
  assert.ok(Math.abs(r.factors.cvss - 49) < 1e-9 && Math.abs(r.factors.vulns - 20) < 1e-9);
});
test('caps: values above caps do not increase the score', () => {
  assert.equal(computeRisk({ ...base, vulnCount: 5 }).score, computeRisk({ ...base, vulnCount: 500 }).score);
  assert.equal(computeRisk({ ...base, majorsBehind: 4 }).score, computeRisk({ ...base, majorsBehind: 40 }).score);
});
test('severity thresholds at the boundaries', () => {
  for (const [s, v] of [[0, 'low'], [24, 'low'], [25, 'medium'], [49, 'medium'], [50, 'high'], [74, 'high'], [75, 'critical'], [100, 'critical']] as const) assert.equal(severityOf(s), v, `score ${s}`);
  assert.throws(() => severityOf(-1), RiskInputError); assert.throws(() => severityOf(101), RiskInputError); assert.throws(() => severityOf(NaN), RiskInputError);
});
test('invalid or missing inputs are rejected', () => {
  assert.throws(() => computeRisk({ ...base, cvss: 11 }), RiskInputError);
  assert.throws(() => computeRisk({ ...base, cvss: -1 }), RiskInputError);
  assert.throws(() => computeRisk({ ...base, vulnCount: 1.5 }), RiskInputError);
  assert.throws(() => computeRisk({ ...base, maintenance: 2 }), RiskInputError);
  assert.throws(() => computeRisk({ ...base, majorsBehind: NaN }), RiskInputError);
  assert.ok(validateRiskInputs(undefined).length > 0); assert.ok(validateRiskInputs({}).length === 4);
});
test('severityCounts', () => {
  assert.deepEqual(severityCounts([0, 30, 60, 80, 99, 10]), { critical: 2, high: 1, medium: 1, low: 2 });
});
