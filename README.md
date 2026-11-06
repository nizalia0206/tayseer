# Tayseer (تيسير) prototype
One learner card that grows with Sara: her university enrollment, achievements and qualifications, shared only with the people and organizations she chooses.
Frontend design and experience follow Tayseer (warm UAE gold palette, Inter / Roboto / Noto Kufi Arabic, card layout, accessibility drawer). Functionality, roles and server-side permission checks are EduPass.
React + TypeScript + Tailwind v4 client, Node backend.

Run:   npm run install:all && npm run build && npm start   -> http://localhost:3000  (demo PIN 1234)
Test:  npm test            (client tests + backend API tests in test/api.test.js; `npm run test:api` runs the backend tests alone)
Dev:   npm start, then in client/: npm run dev  (hot reload on 5173, proxies /api)

Demo: sign in as Sara, then use the account menu (top right) to switch demo accounts. The account menu also opens the Demo guide (Sara's 8 stages, step by step).
Accessibility menu: dark mode, colors (gold, blue, red, green), contrast, highlight, font size, cursor size, saturation, sign language, letter spacing, reduce motion, simple mode (hides secondary hints), reset. Saved on this device only, never on the card.
Sign language: put Emirati Sign Language clips in client/public/sign/ (card.mp4, learning.mp4, share.mp4, ...). Missing clips show a placeholder; Sara or her parent can request an interpreter, which goes to the support coordinator for approval.
All data is simulated in server memory. UAE PASS, the university connection, guardian verification and notifications are simulated and labelled as such.

## Hosting on Vercel (via GitHub)

The repo is ready for Vercel: `vercel.json`, `api/index.js` (runs the same server code as a function) and a prebuilt `client/dist`.

1. Push this folder's contents to the root of your GitHub repo. `node_modules` is ignored, and `client/dist` must be committed.
2. In Vercel, choose **Add New → Project**, import the repo, and keep the settings Vercel reads from `vercel.json` (no framework, no build step).
3. Optional environment variables: `SESSION_SECRET` (any long random text), and `ANTHROPIC_API_KEY` to give Safeer a real AI model.
4. Click **Deploy**. Every push to the main branch redeploys automatically.

**Demo data on Vercel works with no extra setup.** Vercel runs the server as short-lived instances, so plain in-memory data would differ from click to click. On Vercel the server therefore keeps each browser's demo state in signed, HttpOnly cookies (`carry.js`). Every instance reads the same state, so the demo behaves as it does with `npm start`. The signature stops the browser from altering the state, and all permission checks still run on the server. Each browser has its own demo.

**Every visit starts a fresh demo.** Opening or reloading the site signs out and puts Sara back at the first get-started step (locally as well as on Vercel). Opening a share link or a card verification link only signs out, so the share being opened is kept.
Optional: to share one demo across all browsers, connect **Storage → Upstash for Redis** in Vercel and redeploy. When `KV_REST_API_URL` / `KV_REST_API_TOKEN` are present, `store.js` is used instead.
Set `SESSION_SECRET` so that sign-ins and demo state survive redeploys.

If you change the front end, rebuild `client/dist` locally (`npm --prefix client install && npm run build`) and commit it.

## Safeer (سفير) AI assistant and agent

Safeer is the falcon assistant from the Tayseer passport prototype, renamed and added to this app. Nothing else in the app was changed.

- **Where:** the "Safeer AI" button at the bottom of the side nav, in every perspective (student, parent supporter, advisor, teacher, reviewer, registrar, organizer, training provider, governance, operator, coordinator).
- **Ask:** answers questions using only what the signed-in role may see. Support documents are never used.
- **Find what to do next (student):** a consent-gated agent. Code reads the profile, scores opportunities and lists real actions. The AI only writes the reasons. Guardrails drop unknown picks and remove promises. A Code/AI trace shows each step.
- **Guide me:** jumps to the right page.
- **3D falcon:** three.js, loaded on demand. On devices without a GPU (software rendering) or without WebGL, the 2D falcon is shown. Add `?safeer3d` to the URL to force 3D.
- **AI model (optional):** set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`) before `npm start`. Without a key Safeer runs a rule-based simulation, and the panel says so.
- **Install:** run `npm --prefix client install` once to get `three`, then rebuild the client.

## v0.9 feedback fixes and visual refresh
- IMPORTANT after upgrading: stop the old server and run `npm start` again. The client now checks the server version and shows a warning if an older server is still running (that is what makes the card, documents and sharing look empty). HTML is served with no-store and assets carry a version query, so browsers pick up new builds.
- Sign-in: "Sign in with UAE PASS" only (simulated). Choosing a person signs in to that person's own demo account. There are no input fields; no username, password, Emirates ID or OTP is ever asked for.
- Learner card redesigned as a physical card: learner ID, card number, current institution, emirate, curriculum, year, previous school, QR status check (falls back to a clear message if unavailable).
- Card details: an Academic documents list (one row per type, at least one document each, with a Show button that opens the mock document).
- My Learning: new "Previous learning" tab (current education, previous schools with their documents, other documents).
- Parent/Guardian Supporter: new Overview ("Sara at a glance") showing Sara's profile, allowed permissions, upcoming deadlines, application draft and recent records, each only if Sara allows it. In the demo seed, the supporter relationship is already verified so Deadlines and Application draft are visible straight away; Sara can still change or revoke permissions.
- Governance: record types are chosen per issuer (sensible defaults), no confirm dialog, and a clear success message.
- Issuer dashboards (registrar, competition organizer, training provider) show their governance approval status and only offer approved record types. Direct issuance by the registrar no longer depends on the import mapping (the mapping still gates imports).
- More mock documents to share: Grade 11 promotion certificate, Grade 12 equivalency certificate, AP and SAT results, national STEM competition certificate, training certificate, leadership letter.
- Journey step 8 "Keep growing" lists both transfers: SPEA (Sharjah) to KHDA (Dubai), and UAE national university to UK-based institution.
- Visual refresh: editorial page headers, numbered navigation, restrained status markers, no emoji in the interface.

## v0.8 previous learning, transfers and requirement-driven sharing
- Learner card: Learner ID (ULL-2026-0048213, demo), current education (institution, emirate, curriculum, year, status), previous school, and a QR that opens a status-only card check (`/#/verify/<card no>`, demo). **Print card** prints only the card (print CSS + `printEl` in `client/src/docs.tsx`).
- "What's inside my card?": Current education, Previous Learning Records (each school expands to its marksheets and supporting documents), document counts, transfer history.
- Fictional demo documents (`demo-data.js`): CBSE Grade 9, American Grade 10/11 marksheets, Grade 12 interim report, transfer certificates, curriculum-change approvals, enrollment confirmations, promotion certificate, university transcript and enrollment, volunteering record. Every document opens in a watermarked viewer labelled "DEMO — NOT AN OFFICIAL DOCUMENT", printable on its own. Competition achievement, training and qualification records open in the same viewer.
- My Learning tabs: Timeline, School transfer (Sharjah/SPEA American → Dubai/KHDA British, 11 stages, document checklist with Required / Uploaded / Awaiting verification / Verified / Rejected / Not applicable, "What is it for?", missing documents, next action, [validate] labels from the sample transfer pack), University transfer (credit-hour BSc → UK-style BEng: progress tracker, who submits / issues / assesses / decides, credit assessment by the receiving university, outstanding requirements, demo upload).
- Timeline now includes previous schools, documents, transfers, curriculum changes and the submitted competition application (ref APP-2026-0001, organization, date, status updates, link). Applications are dashed and labelled "not a credential"; achievements have a gold edge. Applications never appear for advisors or teachers.
- Sharing: recipient requirements are shown first (required / optional / not requested); checklist states (required and selected, required but not selected, optional, not applicable); documents, records and the submitted application are selectable individually; review shows access conditions; after confirming, a "What can the recipient see?" report (reference SHR-…, recipient, purpose, dates, documents, issuers, verification, exclusions, permitted count) can be printed. Shares are grouped Active / Expired / Revoked with access history. The QR holds only a random temporary link (demo, no cryptographic signature).
- Terminology: Parent supporter / Parent/Guardian Supporter / Authorized Supporter (no "mother").
- Sign-in: UAE PASS simulation screen and fields removed; labelled demo authentication.
- Teacher and advisor dashboards: Sara + 3 fictional learners (ULL-2026-0048214…16) with search, profile summary, timeline and authorised records; access follows each learner's authorisation and role (teachers: academic only).
- Interoperability & Standards (registrar and governance): record flow, W3C VC 2.0, CLR 2.0, Open Badges 3.0, OpenID4VCI/VP, UAE context (MOE, KHDA, SPEA, MOHESR, TDRA, PDPL), original-vs-normalized grading, illustrative unsigned credential. Marked demo / proposed / requires validation.
- New API: `/api/history`, `/api/transfers/:id/items/:item/upload`, `/api/learners`, `/api/learners/:ref`, `/api/card/qr.svg`, `/api/verify/:ref`; `/api/timeline` adds `events`; `/api/share-options` adds `items` and per-recipient `requirements`; grants carry `ref` and an access `log`.
- Tests: 25 backend (6 new).

## v0.7 unified educational platform 
- Learner navigation reduced to six items: My Card, My Learning, Opportunities, Applications, Sharing, Support & Access. Before Sara's card exists she only sees the setup flow.
  Role dashboards: supporter (Sara's learning / Deadlines / Application draft / My permissions), Class view (teacher), Advising, Support requests (coordinator), Review shared records (reviewer), Issuer dashboard (university registrar), Organizer / Training provider, Governance, Operations. The Demo guide is in the account menu.
- My Card: learner card (name, learner reference, status, institution, enrollment or qualification, achievement count), "Your next step" derived from real server state, Sara's 8-stage journey, and "What's inside my card?" (Identity, Education, Education records, Achievements, Not official records). Every record shows title, issuing organization, date of enrollment/achievement, date added, verification, current status and previous versions. Accessibility preferences and support documents are never on the card.
- Setup (onboarding) grouped into 4 screens: confirm details, connect university (simulated), supporters, create card. Server steps unchanged.
- Sharing: one destination, reached from the nav and the card's Share button. Recipient -> purpose -> explicit record selection (nothing pre-selected, excluded records listed) -> review with expiry (1, 7 or 30 days) -> temporary QR + link. Active sharing permissions with Show QR / Revoke.
- Status vocabulary everywhere: Verified, Pending, Expired, Revoked, Replaced (+ Active, Draft, Submitted, Under review, Accepted, Declined).
- Seed data is now a university story: Al Noor University (enrollment BSc Engineering, can also issue qualifications), Sustainability Competition B, Future Skills Academy (training, needs governance approval), Hope Foundation, Future University E. New demo account `trainer` (organizer role for Future Skills Academy).
- New server-enforced rules (all additive; earlier checks kept):
  - Supporter (Sara's mother): Sara chooses `records`, `deadlines`, `draft` (POST /api/access/supporter), can revoke and invite again. The supporter never gets support documents (GET /api/support 403), never shares (all /api/grants and /api/share-options are Sara-only), never submits (POST /api/apply with submit 403), cannot request corrections or edit interests. With only `deadlines`, GET /api/apply returns status without content. Governance cannot re-approve a link Sara revoked.
  - Advisor: Sara turns access on/off and picks academic and/or achievements (POST /api/access/advisor). Records, timeline, advice and observations follow that choice. Applications and support documents are never visible to advisors.
  - Sharing: optional `purpose` (validated list) and `days` (1, 7, 30; default 1 day as before). The reviewer sees org, purpose and expiry only after the four checks pass.
  - Applications keep `helpedBy: 'parent'` so the card can say "Draft prepared with help from Sara's mother. Reviewed and submitted by Sara."
  - Suggestions match interests OR active records and return `why` reasons; never an eligibility decision.
- Tests: 19 backend (14 existing, 5 new for supporter, advisor, sharing purpose/expiry, suggestions, graduation). Client tests updated for the EduPass brand; timeline tests unchanged.
- Still missing: notifications, real integrations, persistent storage, tamper-proof audit, a real QR on the card itself (sharing QR codes are real), accessibility testing with real users and screen readers.

## v0.5 additions (server-enforced, all simulated in memory)
- Import: POST /api/import (issuer only, mapping must be approved). Duplicate = same issuer + source ID + same content; changed content = conflict; missing fields = rejected.
- Corrections: Sara/parent request, only the issuing org approves; approval creates `<id>-v2`, old record becomes `superseded` and stays visible.
- Sharing: choose recipient org (Hope Foundation or Future University E); the server checks recipient, active/revoked/expired, and that the requested record is in the grant (`/open?rec=ID`). New: revoke.
- Activity log (admin only) is editable demo data, not tamper-proof.

## v0.6 additions
- Simulated UAE PASS screen (approve / cancel / failure). No real credentials are collected; the demo PIN is used internally. "Unlisted staff member" shows the no-membership state.
- Onboarding (7 steps) then card generation, only after all steps. Card holds name, school, enrollment + issuer, learner reference, status. No QR (labelled).
- New roles: competition organizer, governance administrator, platform operator.
- Governance: approve / reject / suspend issuers (reason required, types assigned, approver recorded); guardian link pending / approved / rejected / expired (auto-expires on the review date).
- Organizer: issue award/participation; a qualification is rejected by the server; application status updates.
- Demo clock (governance/operator), reset (operator only), retention review (attachments deleted after due date unless held or an application is under active review; learner records are never touched).
- Opportunities: deterministic matching with supporting record IDs, editable interests, dismiss, "Eligibility not verified". Not an AI model; future hook is GET /api/suggestions.
- Demo tab: feature status (Implemented / Simulated / Future) and 17-step walkthrough.
- Secondary screens (Governance, Organizer, Operations, Demo, retention) are English only and say so. Core journey and navigation have Arabic.
- Still missing: notifications, full guardian dashboard, advisor visibility settings, support-document permissions, QR on the card, persistent storage, accessibility testing with real users.

## v0.6.1 backend integrity (Task 1)
- One issuing path: issuer is always the signed-in organisation (never a body field); issuer must be approved for the record type; same source ID + same content = duplicate, different content = 409; record IDs are unique (`ENR`/`AWD`/`ACD`...).
- Revoke and correction decisions are issuer-owned: admin or organizer, only for records of their own organisation. Corrections need a reason and a replacement, one pending request per record, versions `-v2`, `-v3`.
- Import also requires an approved issuer (suspended issuers are blocked; existing records untouched).
- Parent access (records, observations, apply, grants) follows the guardian link status: pending, rejected or expired = no access.
- Sharing: unknown recipient or non-active records are rejected (no silent fallback); revoke is final and cannot be turned into "expired"; revoke/expire/open only by POST; revoked records never shown; a corrected record is shown as its current version; expiry uses the demo clock. New `GET /api/grants` lists the learner's grants.
- Applications: drafts are private until submitted; submitted applications are locked unless the organizer asks for more information; submit needs name and description; the organizer can only update a submitted application. Step-free support request no longer depends on other support items.
- Onboarding card shows the current (non-superseded) enrollment.

## v0.6.2 lifelong learner timeline (Task 2)
- Records now carry `date` (when it happened; issuers and import rows may supply it, validated as a real date not in the future, default today) and `issuedAt` (when added to EduPass). A correction keeps the original `date`.
- `GET /api/timeline` (same visibility as records): newest first, each entry has category (academic / extracurricular), issuer, verification (approved issuer, revoked, replaced, issuer suspended / not approved / unlisted), version history, and connections: results and activities link to the enrollment that was current on their date; the enrollment lists them as related records. A verified badge means the issuer is approved on EduPass, not that every detail is true.
- Timeline screen (`client/src/timeline.tsx`): year groups, category chips with counts, year / issuer / search filters, sort order, "show replaced versions", expandable details (aria-expanded), jump links between connected and earlier versions, empty states (no records, empty category, no filter match, role not allowed). Arabic + RTL (logical spacing) and a mobile layout (stacked filters, 44px targets). Old demo buttons moved under "Demo actions".
- Tests: 14 backend, 21 client. Not yet checked on a real phone or with a screen reader.
