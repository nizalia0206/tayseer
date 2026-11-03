'use strict';
// Safeer (سفير): Tayseer's AI assistant and agent, ported from the passport "Saqr" falcon agent.
// Code decides what is true (records, permissions, scores, actions). The model may only choose and explain, inside checks.
// Every answer is built from facts the signed-in role is already allowed to see. Support documents are never included.
// Without ANTHROPIC_API_KEY a rule-based simulation runs and says so. Optional: ANTHROPIC_MODEL, ANTHROPIC_BASE_URL (e.g. a mock).
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const BASE = () => process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
const KEY = () => process.env.ANTHROPIC_API_KEY || '';
const BANNED = /\b(eligible|eligibility|guarantee[sd]?|will be accepted|you will (?:win|get in|be selected)|definitely|certain to)\b|مضمون|ستُقبل|سيُقبل|أكيد/i;
const NOTE = { en: 'These are suggestions. Each provider decides who is accepted. Safeer never decides.', ar: 'هذه اقتراحات فقط. كل جهة هي التي تقرر القبول، وسفير لا يقرر.' };

async function claude(body) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 60000);
  try {
    const r = await fetch(BASE() + '/v1/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL(), ...body }) });
    const j = await r.json(); if (!r.ok) throw new Error((j && j.error && j.error.message) || 'model error ' + r.status); return j;
  } finally { clearTimeout(timer) }
}
const text = j => (j.content || []).map(x => x.text || '').join('').trim();

// ---------- facts: what this role may see (no support documents, no Emirates ID) ----------
const itemsOf = t => t.stages ? t.stages.flatMap(s => s.items) : (t.groups || []).flatMap(g => g.items);
function suggest(h) {
  const { DB } = h, act = DB.records.filter(r => r.status === 'active'), words = r => (r.title + ' ' + (r.level || '')).toLowerCase();
  return h.OPPS.filter(o => !DB.dismissed.includes(o.id)).map(o => {
    const hits = o.tags.filter(t => DB.interests.includes(t)), recs = act.filter(r => o.tags.some(t => words(r).includes(t)));
    const why = [...hits.map(t => `matches the interest "${t}"`), ...recs.map(r => `related to the record "${r.title}"`)];
    return { id: o.id, title: o.title, org: o.org, kind: o.kind, deadline: o.deadline, tags: o.tags, score: Math.min(95, 40 + 20 * hits.length + 15 * recs.length), why };
  }).filter(o => o.why.length).sort((a, b) => b.score - a.score || a.deadline.localeCompare(b.deadline));
}
function appState(DB) { return { title: 'Sustainability Challenge 2026', organizer: 'Sustainability Competition B', state: DB.apply.submitted ? (DB.apply.status || 'submitted') : (DB.apply.name || DB.apply.problem ? 'draft' : 'not started'), ref: DB.apply.ref || null } }
function facts(u, h) {
  const { DB } = h, base = { role: u.role, organisation: u.org };
  if (u.role === 'sara') {
    const cur = DB.history.schools.find(s => s.current);
    return { ...base,
      currentEducation: cur && { institution: cur.name, emirate: cur.emirate, curriculum: cur.curriculum, year: cur.grades },
      previousSchools: DB.history.schools.filter(s => !s.current).map(s => ({ school: s.name, emirate: s.emirate, authority: s.authority, curriculum: s.curriculum, grades: s.grades, years: s.years })),
      records: DB.records.filter(r => r.status !== 'superseded').map(r => ({ title: r.title, type: r.type, issuer: r.issuer, status: r.status, verification: h.verify(r).code })),
      documents: DB.history.docs.map(d => ({ title: d.title, kind: d.kind, issuer: d.issuer, year: d.year })),
      transfers: DB.history.transfers.map(t => ({ title: t.title, status: t.status, missing: itemsOf(t).filter(i => i.status === 'required').map(i => i.name) })),
      application: appState(DB),
      shares: [...DB.grants.values()].map(g => ({ ref: g.ref, recipient: g.org, purpose: g.purpose, status: h.gs(g), records: g.ids.length, decision: g.decision ? g.decision.status : null })),
      supporter: { status: h.gStatus(), permissions: DB.guardian.perms }, advisor: DB.advisor,
      opportunities: suggest(h).map(o => ({ title: o.title, organisation: o.org, deadline: o.deadline, why: o.why })),
      notIncluded: ['Support arrangements and support documents', 'Emirates ID'] };
  }
  if (u.role === 'parent') {
    const on = h.gStatus() === 'approved', p = DB.guardian.perms, f = { ...base, supporterStatus: h.gStatus(), permissions: p, neverAllowed: ['Support documents', 'Sharing Sara’s records', 'Submitting applications'] };
    if (on && p.records) f.saraRecords = DB.records.filter(r => r.status !== 'superseded').map(r => ({ title: r.title, issuer: r.issuer, status: r.status }));
    if (on && p.deadlines) f.deadlines = suggest(h).map(o => ({ title: o.title, organisation: o.org, deadline: o.deadline }));
    if (on && (p.draft || p.deadlines)) f.application = appState(DB);
    return f;
  }
  if (u.role === 'advisor' || u.role === 'teacher') {
    const vis = h.visFor(u), f = { ...base, rules: u.role === 'advisor' ? 'Each learner decides which kinds of records the advisor sees. Applications and support documents are never shown.' : 'Teachers see academic records and approved support arrangements only.' };
    f.sara = h.see(u) ? { learnerId: h.DEMO.LEARNER.ref, records: DB.records.filter(vis).filter(r => r.status !== 'superseded').map(r => ({ title: r.title, type: r.type, status: r.status })) } : 'Sara has not given access';
    f.otherDemoLearners = h.DEMO.COHORT.map(c => ({ name: c.name, learnerId: c.ref, programme: c.curriculum, year: c.grade, status: c.status, access: u.role === 'teacher' ? c.auth.teacher : !!c.auth.advisor }));
    return f;
  }
  if (u.role === 'reviewer') return { ...base, howItWorks: 'Open the learner’s link or scan the QR. The server checks your organisation, expiry, revocation and that each record is included. You then see only the records the learner chose, and can approve or reject the request with a note.', sharesAddressedToYou: [...DB.grants.values()].filter(g => g.org === u.org && h.gs(g) === 'active').length };
  if (u.role === 'admin' || u.role === 'organizer') { const i = DB.issuers.find(x => x.org === u.org); return { ...base, issuerStatus: i ? i.status : 'unlisted', permittedTypes: i ? i.types : [], pendingCorrections: DB.corr.filter(c => c.status === 'pending' && (DB.records.find(r => r.id === c.recordId) || {}).issuer === u.org).length } }
  if (u.role === 'governance' || u.role === 'operator') return { ...base, issuers: DB.issuers.map(i => ({ id: i.id, organisation: i.org, status: i.status, types: i.types })), supporterLink: h.gStatus() };
  if (u.role === 'coordinator') return { ...base, supportRequestsPending: DB.support.filter(s => s.status !== 'approved').length };
  return base;
}

// ---------- rule-based answers (used without a model, and as the fallback) ----------
function rulesAnswer(u, q, F, lang) {
  const L = (en, ar) => lang === 'ar' ? ar : en, has = re => re.test(q), list = a => a.length ? a.join(', ') : L('none', 'لا شيء');
  if (u.role === 'sara') {
    if (has(/miss|document|upload|ناقص|مستند|وثيق/i)) { const tr = F.transfers.filter(t => t.missing.length).map(t => `${t.title}: ${t.missing.join(', ')}`);
      return L(`Missing documents: ${tr.length ? tr.join('; ') : 'none'}. Your application is ${F.application.state}. Open My Learning → University transfer to upload what is missing.`, `المستندات الناقصة: ${tr.length ? tr.join('؛ ') : 'لا شيء'}. حالة طلبك: ${F.application.state}. افتحي تعلّمي ← الانتقال الجامعي لرفع الناقص.`) }
    if (has(/good|strength|achiev|record|إنجاز|قوت|سجل/i)) { const a = F.records.filter(r => r.status === 'active').map(r => r.title);
      return L(`From your verified records: ${list(a)}. You also hold ${F.documents.length} academic and activity documents from previous schools and providers.`, `من سجلاتك الموثّقة: ${list(a)}. ولديك أيضاً ${F.documents.length} مستنداً من مدارس وجهات سابقة.`) }
    if (has(/who|see|privacy|access|يرى|خصوص|وصول/i)) { const act = F.shares.filter(s => s.status === 'active');
      return L(`Your parent supporter: ${F.supporter.status}, allowed ${list(Object.keys(F.supporter.permissions).filter(k => F.supporter.permissions[k]))}. Your advisor: ${F.advisor.on ? 'on, ' + F.advisor.scope.join(' and ') : 'off'}. Active shares: ${act.length ? act.map(s => `${s.recipient} (${s.records} records)`).join(', ') : 'none'}. Support documents are never shared.`, `ولي الأمر الداعم: ${F.supporter.status}. المرشد: ${F.advisor.on ? 'مفعّل' : 'متوقف'}. المشاركات النشطة: ${act.length}. لا تُشارك وثائق الدعم أبداً.`) }
    if (has(/transfer|انتقال/i)) return L(F.transfers.map(t => `${t.title}: ${t.status}${t.missing.length ? ' (missing: ' + t.missing.join(', ') + ')' : ''}`).join('. ') + '. Credit recognition is the receiving university’s decision.', F.transfers.map(t => `${t.title}: ${t.status}`).join('. ') + '. معادلة الساعات قرار الجامعة المستقبِلة.')
    if (has(/opportun|scholar|suggest|فرص|منح|اقتراح/i)) { const o = F.opportunities.slice(0, 3);
      return L(`Suggestions: ${o.map(x => `${x.title} (${x.organisation}, deadline ${x.deadline}) because it ${x.why[0]}`).join('; ')}. ${NOTE.en}`, `اقتراحات: ${o.map(x => `${x.title} (${x.organisation})`).join('؛ ')}. ${NOTE.ar}`) }
    if (has(/apply|application|طلب|تقديم/i)) return L(`${F.application.title}: ${F.application.state}${F.application.ref ? ' (' + F.application.ref + ')' : ''}. Only you can submit it.`, `${F.application.title}: ${F.application.state}. أنتِ وحدك تقدّمينه.`)
    if (has(/card|school|curricul|بطاق|مدرس|منهج/i)) return L(`You study at ${F.currentEducation.institution} (${F.currentEducation.emirate}, ${F.currentEducation.curriculum}, ${F.currentEducation.year}). Previous schools: ${F.previousSchools.map(s => `${s.school} (${s.curriculum})`).join(', ')}.`, `تدرسين في ${F.currentEducation.institution}. المدارس السابقة: ${F.previousSchools.map(s => s.school).join('، ')}.`)
    return L('I can tell you what is missing, what you are good at, who can see your data, how your transfers are going, which opportunities fit you and where your application stands. I never decide eligibility.', 'أستطيع إخبارك بالناقص ونقاط قوتك ومن يرى بياناتك وحالة انتقالاتك والفرص المناسبة وحالة طلبك. لا أقرر الأهلية أبداً.')
  }
  if (u.role === 'parent') {
    if (F.supporterStatus !== 'approved') return L(`Your supporter access is ${F.supporterStatus}, so I cannot show Sara’s information.`, `صلاحية الدعم الخاصة بك: ${F.supporterStatus}، لذا لا أستطيع عرض معلومات سارة.`)
    if (has(/deadline|موعد/i) && F.deadlines) return L('Upcoming deadlines: ' + F.deadlines.map(d => `${d.title} (${d.deadline})`).join(', '), 'المواعيد القادمة: ' + F.deadlines.map(d => `${d.title} (${d.deadline})`).join('، '))
    if (has(/apply|draft|application|طلب|مسودة/i) && F.application) return L(`${F.application.title}: ${F.application.state}. You can prepare a draft; only Sara submits.`, `${F.application.title}: ${F.application.state}. يمكنك إعداد مسودة، وسارة وحدها تقدّم.`)
    return L(`Sara allows you to: ${list(Object.keys(F.permissions).filter(k => F.permissions[k]))}. Never allowed: ${F.neverAllowed.join(', ')}.`, `تسمح لك سارة بـ: ${list(Object.keys(F.permissions).filter(k => F.permissions[k]))}. غير مسموح أبداً: وثائق الدعم والمشاركة والتقديم.`)
  }
  if (u.role === 'advisor' || u.role === 'teacher') { const ok = F.otherDemoLearners.filter(l => l.access).map(l => l.name);
    return L(`${F.rules} You can open: ${typeof F.sara === 'string' ? '' : 'Sara A., '}${list(ok)}. Learners without access stay locked until they authorise you.`, `${u.role === 'advisor' ? 'يختار كل متعلّم ما يراه المرشد.' : 'يرى المعلمون السجلات الأكاديمية فقط.'} المتاح: ${list(ok)}.`) }
  if (u.role === 'reviewer') return L(`${F.howItWorks} Active shares addressed to ${F.organisation}: ${F.sharesAddressedToYou}.`, `افتح رابط المتعلّم أو امسح الرمز. يتحقق الخادم من جهتك والانتهاء والسحب والسجلات. ثم ترى ما اختاره المتعلّم فقط ويمكنك الاعتماد أو الرفض. المشاركات النشطة: ${F.sharesAddressedToYou}.`)
  if (u.role === 'admin' || u.role === 'organizer') return L(`${F.organisation} is ${F.issuerStatus}${F.permittedTypes.length ? ' to issue ' + F.permittedTypes.join(', ') : ''}. Pending correction requests: ${F.pendingCorrections}.`, `${F.organisation}: ${F.issuerStatus}. طلبات التصحيح المعلّقة: ${F.pendingCorrections}.`)
  if (u.role === 'governance' || u.role === 'operator') return L(`Issuers: ${F.issuers.map(i => `${i.organisation} (${i.status})`).join(', ')}. Supporter link: ${F.supporterLink}.`, `الجهات المصدِرة: ${F.issuers.map(i => `${i.organisation} (${i.status})`).join('، ')}.`)
  if (u.role === 'coordinator') return L(`Support requests waiting for you: ${F.supportRequestsPending}.`, `طلبات الدعم بانتظارك: ${F.supportRequestsPending}.`)
  return L('I can explain how Tayseer works for your role.', 'أستطيع شرح طريقة عمل تيسير لدورك.')
}
const ASK = `You are Safeer (سفير), the assistant inside Tayseer, a UAE lifelong learner card. Answer ONLY from the FACTS given, which are already limited to what this user's role may see. If the facts do not answer the question, say so. Never decide or predict eligibility, admission or acceptance. Never mention support documents. Keep answers short (at most 5 sentences) and reply in the requested language.`;

// ---------- the agent (student only, with consent) ----------
function plan(h) {
  const { DB } = h, opps = suggest(h), app = appState(DB), actions = [];
  DB.history.transfers.forEach(t => itemsOf(t).filter(i => i.status === 'required').forEach(i => actions.push({ ref: `transfer:${t.id}:${i.id}`, kind: 'gap', text: `Upload "${i.name}" for ${t.title}`, tiny: `Find or request "${i.name}"`, view: 'learning', opp: null })));
  opps.forEach(o => {
    if (o.id === 'OPP-1' && app.state !== 'submitted' && !DB.apply.submitted) actions.push({ ref: 'apply:OPP-1', kind: 'apply', text: 'Finish and submit your Sustainability Challenge 2026 application yourself', tiny: 'Open the application and read your draft', view: 'apply', opp: o.id });
    else if (o.kind === 'Scholarship') actions.push({ ref: 'share:' + o.id, kind: 'share', text: `Prepare the documents ${o.org} asks for and share only those`, tiny: `Open Sharing and look at what ${o.org} asks for`, view: 'share', opp: o.id });
    else actions.push({ ref: 'read:' + o.id, kind: 'read', text: `Read what ${o.title} asks for and note the deadline (${o.deadline})`, tiny: `Open ${o.title} and read the first requirement`, view: 'opps', opp: o.id });
  });
  const rank = { gap: 0, apply: 1, share: 2, read: 3 };
  actions.sort((a, b) => rank[a.kind] - rank[b.kind]);
  return { opps, actions };
}
function payloadOf(h, lang, P) {
  const { DB } = h;
  return { lang, interests: DB.interests,
    strengths: DB.records.filter(r => r.status === 'active').map(r => ({ kind: r.type, title: r.title, verified: h.verify(r).code === 'verified' })).concat(DB.history.docs.filter(d => ['achievement', 'training', 'volunteering', 'external_exam'].includes(d.kind)).map(d => ({ kind: d.kind, title: d.title, verified: d.status === 'verified' }))),
    gaps: P.actions.filter(a => a.kind === 'gap').map(a => a.text),
    opportunities: P.opps.map(o => ({ id: o.id, title: o.title, kind: o.kind, organisation: o.org, deadline: o.deadline, score: o.score, reasons: o.why, actions: P.actions.filter(a => a.opp === o.id).map(a => ({ ref: a.ref, text: a.text })) })),
    otherActions: P.actions.filter(a => !a.opp).map(a => ({ ref: a.ref, text: a.text })),
    notSent: ['name', 'learner ID', 'Emirates ID', 'support arrangements and documents'] };
}
const AGENT = `You are Safeer, the agent inside Tayseer, helping a UAE university student choose what to do next.
Work like an agent: call get_profile first, then search_opportunities (try a kind or an interest) and get_opportunity for the ones you consider, then call submit_plan exactly once.
Rules: scores and actions were computed by code; you cannot change them or invent new ones. Use only opportunity ids and action refs that tools returned. Never decide or predict eligibility or acceptance and never promise outcomes. Give each pick a "why" of 1 to 2 sentences tied to the student's real records. The week has at most 7 items, one per action ref, days 1 to 7, missing documents first. You may use the ref "review" once for the last day. Write in the language given.`;
const TOOLS = [
  { name: 'get_profile', description: "The student's interests, verified strengths and missing documents. Call first.", input_schema: { type: 'object', properties: {} } },
  { name: 'search_opportunities', description: 'Scored opportunities (score 0-100 computed by code, never eligibility). Optional filters.', input_schema: { type: 'object', properties: { kind: { type: 'string' }, interest: { type: 'string' } } } },
  { name: 'get_opportunity', description: 'One opportunity in full with its reasons and real actions (refs).', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'submit_plan', description: 'Submit the final answer once.', input_schema: { type: 'object', properties: { picks: { type: 'array', maxItems: 4, items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } }, week: { type: 'array', maxItems: 7, items: { type: 'object', properties: { day: { type: 'integer' }, ref: { type: 'string' }, text: { type: 'string' } }, required: ['day', 'ref', 'text'] } } }, required: ['picks', 'week'] } }];
function runTool(name, input, P) {
  if (name === 'get_profile') return { data: { interests: P.interests, strengths: P.strengths, gaps: P.gaps, otherActions: P.otherActions }, summary: `${P.strengths.length} strengths, ${P.gaps.length} missing documents` };
  if (name === 'search_opportunities') { let r = P.opportunities; if (input.kind) r = r.filter(o => o.kind.toLowerCase() === String(input.kind).toLowerCase()); if (input.interest) r = r.filter(o => o.reasons.some(x => x.toLowerCase().includes(String(input.interest).toLowerCase())));
    r = r.map(o => ({ id: o.id, title: o.title, kind: o.kind, score: o.score, deadline: o.deadline })); return { data: r, summary: `${r.length} result${r.length === 1 ? '' : 's'}` } }
  if (name === 'get_opportunity') { const o = P.opportunities.find(x => x.id === input.id); return o ? { data: o, summary: o.title } : { data: { error: 'unknown id' }, summary: 'unknown id' } }
  return { data: { error: 'unknown tool' }, summary: 'unknown tool' };
}
async function askModelAgent(P) {
  const tools = [], messages = [{ role: 'user', content: `Language: ${P.lang === 'ar' ? 'Arabic' : 'English'}. Choose what this student should do next and plan the first week. Start with get_profile.` }];
  for (let turn = 0; turn < 7; turn++) {
    const j = await claude({ max_tokens: 2000, system: AGENT, tools: TOOLS, messages }); messages.push({ role: 'assistant', content: j.content });
    const uses = (j.content || []).filter(b => b.type === 'tool_use'); if (!uses.length) break;
    const sub = uses.find(x => x.name === 'submit_plan'); if (sub) { const a = sub.input || {}; return { picks: a.picks || [], week: a.week || [], tools } }
    messages.push({ role: 'user', content: uses.map(x => { const o = runTool(x.name, x.input || {}, P); tools.push({ name: x.name, input: x.input || {}, summary: o.summary }); return { type: 'tool_result', tool_use_id: x.id, content: JSON.stringify(o.data) } }) });
  }
  return null;
}
function check(raw, P, lang) {
  let removed = 0; const byId = new Map(P.opps.map(o => [o.id, o])), said = new Map();
  ((raw && raw.picks) || []).forEach(p => { const id = String(p.id); if (byId.has(id) && !said.has(id)) said.set(id, String(p.why || '')) });
  const chosen = said.size ? P.opps.filter(o => said.has(o.id)).slice(0, 4) : P.opps.slice(0, 3); // always in the code's order
  const codeWhy = o => o.why.slice(0, 2).map(x => x[0].toUpperCase() + x.slice(1)).join('. ') + '.';
  const picks = chosen.map(o => { const w = said.get(o.id); if (!w || BANNED.test(w)) { if (w) removed++; return { id: o.id, title: o.title, org: o.org, kind: o.kind, deadline: o.deadline, score: o.score, why: codeWhy(o) } } return { id: o.id, title: o.title, org: o.org, kind: o.kind, deadline: o.deadline, score: o.score, why: w } });
  const allowed = P.actions.filter(a => !a.opp || chosen.some(o => o.id === a.opp)), refs = new Map(allowed.map(a => [a.ref, a])), seen = new Set(), week = [];
  ((raw && raw.week) || []).forEach(w => { const ref = String(w.ref); if (seen.has(ref) || (!refs.has(ref) && ref !== 'review')) return; seen.add(ref);
    const t = String(w.text || ''); if (!t || BANNED.test(t)) { removed++; return } const a = refs.get(ref); week.push({ day: Math.min(7, Math.max(1, Math.round(+w.day) || week.length + 1)), ref, text: t, view: a ? a.view : null }) });
  const fallback = allowed.slice(0, 6).map((a, i) => ({ day: i + 1, ref: a.ref, text: a.text, view: a.view })).concat([{ day: Math.min(7, allowed.slice(0, 6).length + 1), ref: 'review', text: lang === 'ar' ? 'راجعي هذه الخطة مع ولي الأمر الداعم أو المرشد.' : 'Review this plan with your parent supporter or advisor.', view: 'access' }]);
  return { picks, week: (week.length ? week : fallback).sort((a, b) => a.day - b.day), removed };
}

// ---------- routes ----------
async function handle(p, m, u, req, res, h) {
  const { send } = h;
  if (p === '/api/safeer/health' && m === 'GET') return send(res, 200, { live: !!KEY(), model: MODEL(), mode: KEY() ? 'model' : 'rules' });
  if (p === '/api/safeer/context' && m === 'GET') return send(res, 200, { role: u.role, facts: facts(u, h), live: !!KEY() });
  if (p === '/api/safeer/ask' && m === 'POST') {
    const b = await h.body(req), q = String(b.question || '').trim().slice(0, 500), lang = b.lang === 'ar' ? 'ar' : 'en';
    if (!q) return send(res, 400, { error: 'Ask a question first' });
    const F = facts(u, h);
    if (KEY()) { try { const a = text(await claude({ max_tokens: 500, system: ASK, messages: [{ role: 'user', content: `LANGUAGE: ${lang === 'ar' ? 'Arabic' : 'English'}\nFACTS (synthetic, limited to this role):\n${JSON.stringify(F)}\n\nQUESTION: ${q}` }] }));
      if (a && !BANNED.test(a)) { h.audit(u, 'safeer ask (model)'); return send(res, 200, { answer: a, source: 'model', model: MODEL() }) } } catch (e) { console.log('[safeer] model error:', String(e.message || e)) } }
    h.audit(u, 'safeer ask (rules)'); return send(res, 200, { answer: rulesAnswer(u, q, F, lang), source: 'rules' });
  }
  if (p === '/api/safeer/agent' && m === 'POST') {
    if (u.role !== 'sara') return send(res, 403, { error: 'Only Sara can run the Safeer agent on her profile' });
    const b = await h.body(req), lang = b.lang === 'ar' ? 'ar' : 'en';
    if (b.consent !== true) return send(res, 403, { error: 'Allow Safeer to use your profile summary first' });
    const P = plan(h), payload = payloadOf(h, lang, P), en = lang === 'en', trace = [];
    trace.push({ id: 'observe', who: 'code', text: en ? `Read your verified records and documents: ${payload.strengths.length} strengths, ${payload.gaps.length} missing documents.` : `قرأ سجلاتك ومستنداتك الموثّقة: ${payload.strengths.length} نقاط قوة و${payload.gaps.length} مستندات ناقصة.` });
    trace.push({ id: 'match', who: 'code', text: en ? `Scored ${P.opps.length} opportunities with fixed rules (fit, not eligibility).` : `قيّم ${P.opps.length} فرص بقواعد ثابتة (توافق وليس أهلية).` });
    trace.push({ id: 'plan', who: 'code', text: en ? `Listed ${P.actions.length} real actions. The AI may only use these.` : `حدّد ${P.actions.length} إجراءات حقيقية. يستخدم الذكاء الاصطناعي هذه فقط.` });
    let raw = null, tools = [];
    if (KEY()) { try { raw = await askModelAgent(payload); tools = (raw && raw.tools) || [] } catch (e) { console.log('[safeer] agent model error:', String(e.message || e)) } }
    tools.forEach(tc => trace.push({ id: 'tool', who: 'ai', text: `${en ? 'Safeer called' : 'استدعى سفير'} ${tc.name}(${Object.entries(tc.input).map(([k, v]) => k + ': ' + JSON.stringify(v)).join(', ')}) → ${tc.summary}` }));
    trace.push({ id: 'explain', who: 'ai', text: raw ? (en ? 'The AI model chose the opportunities, wrote the reasons and ordered the week.' : 'اختار النموذج الفرص وكتب الأسباب ورتّب الأسبوع.') : (en ? 'Rule-based simulation wrote the reasons (no AI model connected).' : 'محاكاة بالقواعد كتبت الأسباب (لا يوجد نموذج متصل).') });
    const out = check(raw, P, lang);
    trace.push({ id: 'check', who: 'code', text: en ? `Guardrails: kept only known opportunities and actions, ${out.removed} promise${out.removed === 1 ? '' : 's'} removed, order set by the code's scores.` : `الضوابط: أُبقيت الفرص والإجراءات المعروفة فقط، وأُزيل ${out.removed} من الوعود، والترتيب حسب درجات الكود.` });
    h.audit(u, `safeer agent run (${raw ? 'model' : 'rules'}): ${out.picks.length} picks`);
    return send(res, 200, { source: raw ? 'model' : 'rules', model: raw ? MODEL() : null, trace, picks: out.picks, week: out.week, note: NOTE[lang], payload });
  }
  return send(res, 404, { error: 'Not found' });
}
module.exports = { handle, rulesAnswer, check, BANNED };
