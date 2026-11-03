export type Role = 'sara'|'parent'|'teacher'|'reviewer'|'admin'|'advisor'|'coordinator'|'organizer'|'governance'|'operator'|'stranger'
export interface User { id: string; name: string; role: Role; org: string }
export interface Rec { id: string; issuer: string; src: string; title: string; type: string; status: string; level?: string; replacedBy?: string; replaces?: string; date?: string; issuedAt?: string }
export interface Support { id: string; text: string; status: string }
export interface Obs { by: string; text: string; date: string }
export interface Apply { opp?: string; name: string; problem: string; submitted: boolean; by: string|null; draftBy?: string; helpedBy?: string|null; status?: string; redacted?: boolean; ref?: string; submittedAt?: string; log?: { status: string; at: string }[] }
export interface Supporter { name: string; status: string; perms: { records: boolean; deadlines: boolean; draft: boolean }; reviewAt: string }
export interface Access { supporter: Supporter | null; advisor: { on: boolean; scope: string[] } | null }
export interface Grant { token: string; ref?: string; log?: { at: string; by: string; org: string; result: string }[]; org: string; ids: string[]; purpose?: string; days?: number; created?: string|null; status: string; expires: string; by: string }
export interface Onb { onb: { step: number; ref: string|null }; school: Rec; guardian: { status: string; scope: string[]; reviewAt: string } }
export interface Data { records: Rec[]; mapping: { status: string; suggest: string[][] }; apply: Apply; support: Support[]; obs: Obs[]; advice: { basis: string[]; note?: string } | null
  onb?: Onb | null; access?: Access; grants?: Grant[]; corrections?: { id: string; recordId: string; reason: string; fix: string; status: string }[] }
// learner navigation (six items) + role dashboards
export type View = 'card'|'learning'|'opps'|'apply'|'share'|'access'|'class'|'advising'|'support'|'review'|'issuer'|'organize'|'gov'|'ops'|'demo'|'records'|'standards'|'overview'
export interface TEntry { id: string; title: string; type: string; category: 'academic'|'extracurricular'|'application'; date: string; issuedAt: string|null; issuer: string; src: string; level: string|null; status: string; verification: { code: string; label: string }; current: boolean; replaces: string|null; replacedBy: string|null; history: { id: string; title: string; issuedAt: string|null; status: string }[]; context: { id: string; title: string; issuer: string }|null; related: { id: string; title: string }[]; event?: { kind: string; detail?: string; docId?: string; transferId?: string; ref?: string; log?: { status: string; at: string }[] } }
