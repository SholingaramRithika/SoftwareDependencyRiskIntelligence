export type PackageKind = 'runtime' | 'development' | 'peer' | 'optional';
export const PACKAGE_KINDS: PackageKind[] = ['runtime', 'development', 'peer', 'optional'];

export interface RiskInputs {
  cvss: number;          // 0..10  highest recorded severity (dataset-provided)
  vulnCount: number;     // integer >= 0, number of recorded vulnerabilities
  majorsBehind: number;  // integer >= 0, how many major versions behind latest
  maintenance: number;   // 0..1   1 = actively maintained
}
export interface PackageInfo { id: string; kind: PackageKind; description: string }
export interface ReleaseEntry { pkg: string; version: string; risk: RiskInputs }
export interface Edge { from: string; to: string } // "from depends on to"
export interface Release { id: string; label: string; date: string; entries: ReleaseEntry[]; edges: Edge[] }
export interface Dataset {
  id: string; name: string; description: string;
  synthetic: boolean; // true => package names and risk inputs are invented for demonstration
  packages: PackageInfo[]; releases: Release[];
}
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
