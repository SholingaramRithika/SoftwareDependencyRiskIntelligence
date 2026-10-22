import type { Dataset } from './types.ts';
import { PACKAGE_KINDS } from './types.ts';
import { validateRiskInputs } from '../algorithms/risk.ts';

export interface ValidationResult { ok: boolean; errors: string[]; dataset?: Dataset }
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Validate untrusted JSON against the Dataset schema and its relationships. Never throws. */
export function validateDataset(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (m: string) => { if (errors.length < 50) errors.push(m); };
  if (!isObj(raw)) return { ok: false, errors: ['Top-level value must be a JSON object.'] };
  if (!isStr(raw.id)) err('"id" must be a non-empty string.');
  if (!isStr(raw.name)) err('"name" must be a non-empty string.');
  if (typeof raw.synthetic !== 'boolean') err('"synthetic" must be true or false (declare whether the data is invented).');
  if (!Array.isArray(raw.packages) || raw.packages.length === 0) err('"packages" must be a non-empty array.');
  if (!Array.isArray(raw.releases) || raw.releases.length === 0) err('"releases" must be a non-empty array.');
  const pkgIds = new Set<string>();
  if (Array.isArray(raw.packages)) raw.packages.forEach((p, i) => {
    if (!isObj(p) || !isStr(p.id)) return err(`packages[${i}]: "id" must be a non-empty string.`);
    if (pkgIds.has(p.id)) err(`packages[${i}]: duplicate package id "${p.id}".`);
    pkgIds.add(p.id);
    if (!PACKAGE_KINDS.includes(p.kind as never)) err(`packages[${i}] ("${p.id}"): kind must be one of ${PACKAGE_KINDS.join(', ')}.`);
  });
  const relIds = new Set<string>();
  if (Array.isArray(raw.releases)) raw.releases.forEach((r, i) => {
    if (!isObj(r) || !isStr(r.id)) return err(`releases[${i}]: "id" must be a non-empty string.`);
    if (relIds.has(r.id)) err(`releases[${i}]: duplicate release id "${r.id}".`);
    relIds.add(r.id);
    if (!Array.isArray(r.entries)) return err(`releases[${i}] ("${r.id}"): "entries" must be an array.`);
    if (!Array.isArray(r.edges)) return err(`releases[${i}] ("${r.id}"): "edges" must be an array.`);
    const inRel = new Set<string>();
    r.entries.forEach((e, j) => {
      if (!isObj(e) || !isStr(e.pkg)) return err(`releases[${i}].entries[${j}]: "pkg" must be a non-empty string.`);
      if (!pkgIds.has(e.pkg)) err(`releases[${i}].entries[${j}]: unknown package "${e.pkg}".`);
      if (inRel.has(e.pkg)) err(`releases[${i}].entries[${j}]: package "${e.pkg}" listed twice.`);
      inRel.add(e.pkg);
      if (!isStr(e.version)) err(`releases[${i}].entries[${j}] ("${e.pkg}"): "version" must be a non-empty string.`);
      for (const m of validateRiskInputs(e.risk as never)) err(`releases[${i}].entries[${j}] ("${e.pkg}"): ${m}.`);
    });
    r.edges.forEach((e, j) => {
      if (!isObj(e) || !isStr(e.from) || !isStr(e.to)) return err(`releases[${i}].edges[${j}]: "from" and "to" must be strings.`);
      if (!inRel.has(e.from) || !inRel.has(e.to)) err(`releases[${i}].edges[${j}]: ${e.from} -> ${e.to} references a package that is not in this release.`);
    });
  });
  if (errors.length) return { ok: false, errors };
  const d = raw as unknown as Dataset;
  return { ok: true, errors: [], dataset: { ...d, description: typeof raw.description === 'string' ? raw.description : '' } };
}
