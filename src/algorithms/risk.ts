import type { RiskInputs, Severity } from '../data/types.ts';

/**
 * Risk score (0..100), documented formula:
 *   score = 100 * ( 0.50 * cvss/10
 *                 + 0.25 * min(vulnCount, 5)/5
 *                 + 0.10 * min(majorsBehind, 4)/4
 *                 + 0.15 * (1 - maintenance) )
 * Result is rounded to the nearest integer.
 * Severity thresholds: >= 75 critical, >= 50 high, >= 25 medium, otherwise low.
 */
export const RISK_WEIGHTS = { cvss: 0.5, vulns: 0.25, outdated: 0.1, maintenance: 0.15 } as const;
export const VULN_CAP = 5;
export const OUTDATED_CAP = 4;
export const THRESHOLDS = { critical: 75, high: 50, medium: 25 } as const;

export class RiskInputError extends Error {
  constructor(message: string) { super(message); this.name = 'RiskInputError'; }
}
export interface RiskResult {
  score: number; severity: Severity;
  factors: { cvss: number; vulns: number; outdated: number; maintenance: number }; // contribution in score points
}

export function severityOf(score: number): Severity {
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new RiskInputError(`Score ${score} is outside 0..100.`);
  if (score >= THRESHOLDS.critical) return 'critical';
  if (score >= THRESHOLDS.high) return 'high';
  if (score >= THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function validateRiskInputs(r: Partial<RiskInputs> | null | undefined): string[] {
  const errs: string[] = [];
  if (!r || typeof r !== 'object') return ['risk inputs missing'];
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!num(r.cvss) || r.cvss! < 0 || r.cvss! > 10) errs.push('cvss must be a number in 0..10');
  if (!num(r.vulnCount) || !Number.isInteger(r.vulnCount) || r.vulnCount! < 0) errs.push('vulnCount must be an integer >= 0');
  if (!num(r.majorsBehind) || !Number.isInteger(r.majorsBehind) || r.majorsBehind! < 0) errs.push('majorsBehind must be an integer >= 0');
  if (!num(r.maintenance) || r.maintenance! < 0 || r.maintenance! > 1) errs.push('maintenance must be a number in 0..1');
  return errs;
}

export function computeRisk(r: RiskInputs): RiskResult {
  const errs = validateRiskInputs(r);
  if (errs.length) throw new RiskInputError(errs.join('; '));
  const factors = {
    cvss: 100 * RISK_WEIGHTS.cvss * (r.cvss / 10),
    vulns: 100 * RISK_WEIGHTS.vulns * (Math.min(r.vulnCount, VULN_CAP) / VULN_CAP),
    outdated: 100 * RISK_WEIGHTS.outdated * (Math.min(r.majorsBehind, OUTDATED_CAP) / OUTDATED_CAP),
    maintenance: 100 * RISK_WEIGHTS.maintenance * (1 - r.maintenance),
  };
  const score = Math.round(factors.cvss + factors.vulns + factors.outdated + factors.maintenance);
  return { score, severity: severityOf(score), factors };
}

export function severityCounts(scores: number[]): Record<Severity, number> {
  const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const s of scores) c[severityOf(s)]++;
  return c;
}
