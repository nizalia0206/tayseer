'use strict';
// Fictional demo data for Sara's previous learning, transfers and a small demo cohort.
// Rules come from the "UAE Lifelong Learner Profile: Sample Transfer Pack". Anything that needs official confirmation is marked validate:true.
// DEMO ONLY: every name, ID, grade and document is invented. Nothing here is an official record.
const LEARNER = { name: 'Sara A.', ref: 'ULL-2026-0048213' };
const SUBJ = (rows) => rows.map(([subject, original, scale, normalized, credit]) => ({ subject, original, scale, normalized: normalized ?? null, credit: credit ?? null }));

const schools = () => [
  { id: 'SCH-1', name: 'Sample Indian School (CBSE), Dubai', emirate: 'Dubai', authority: 'KHDA', curriculum: 'CBSE', grades: 'Grades 1–9', years: '2012–2022', exit: 'Completed Grade 9, transferred', kind: 'school' },
  { id: 'SCH-2', name: 'Sample American School, Sharjah', emirate: 'Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grades: 'Grades 10–11', years: '2022–2024', exit: 'Completed Grade 11, transferred', kind: 'school' },
  { id: 'SCH-3', name: 'Sample British School, Dubai', emirate: 'Dubai', authority: 'KHDA', curriculum: 'British (A Level)', grades: 'Grade 12 (Year 13)', years: '2024–2025', exit: 'Completed Grade 12', kind: 'school' },
  { id: 'UNI-1', name: 'Al Noor University', emirate: 'Abu Dhabi', authority: 'MOHESR-licensed', curriculum: 'US-style credit-hour system (Bachelor’s)', grades: 'BSc Engineering, Year 2', years: '2025–present', exit: 'Enrolled', kind: 'university', current: true },
];

const docs = () => [
  { id: 'DOC-01', kind: 'marksheet', title: 'Grade 9 marksheet (CBSE)', school: 'SCH-1', issuer: 'Sample Indian School (CBSE), Dubai', authority: 'KHDA', curriculum: 'CBSE', grade: 'Grade 9', year: '2021–22', date: '2022-05-20', status: 'verified', category: 'academic',
    subjects: SUBJ([['English', '84 / A2', 'CBSE 9-point', 84], ['Mathematics', '88 / A2', 'CBSE 9-point', 88], ['Science', '86 / A2', 'CBSE 9-point', 86], ['Social Science', '91 / A1', 'CBSE 9-point', 91], ['Arabic', '90 / A2', 'CBSE 9-point', 90], ['Moral Education', 'Pass', 'Pass/Fail']]),
    summary: 'Normalized average 87.8 (derived)' },
  { id: 'DOC-02', kind: 'transfer_certificate', title: 'Transfer certificate (Grade 9 completed)', school: 'SCH-1', issuer: 'Sample Indian School (CBSE), Dubai', authority: 'KHDA', curriculum: 'CBSE', grade: 'Grade 9', year: '2021–22', date: '2022-06-20', status: 'verified', category: 'academic',
    notes: 'Signed and stamped by the school; attested by KHDA (education authority of the issuing emirate).' },
  { id: 'DOC-03', kind: 'curriculum_approval', title: 'Curriculum-change approval: CBSE to American (Grade 9 to 10)', school: 'SCH-2', issuer: 'UAE Ministry of Education (demo)', authority: 'MOE', curriculum: 'CBSE → American', grade: 'Grade 10', year: '2022–23', date: '2022-07-02', status: 'verified', category: 'academic',
    notes: 'Moves between curricula in Grades 9–12 need MOE approval (per the transfer pack).', validate: true },
  { id: 'DOC-04', kind: 'enrollment_confirmation', title: 'School enrollment confirmation', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 10', year: '2022–23', date: '2022-09-05', status: 'verified', category: 'academic',
    notes: 'Student registration with SPEA (uses Emirates ID; ID not stored in Tayseer).' },
  { id: 'DOC-05', kind: 'marksheet', title: 'Grade 10 marksheet (American curriculum)', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 10', year: '2022–23', date: '2023-06-22', status: 'verified', category: 'academic',
    subjects: SUBJ([['English 10', 'A-', 'US letter', 91, 1], ['Algebra II', 'A-', 'US letter', 91, 1], ['Chemistry', 'A', 'US letter', 95, 1], ['World History', 'B+', 'US letter', 88, 1], ['Arabic', 'A', 'US letter', 95, 1], ['Moral Education / UAE Social Studies', 'Pass', 'Pass/Fail', null, 0]]),
    summary: 'GPA 3.74 / 4.0 · 5.0 Carnegie credits' },
  { id: 'DOC-06', kind: 'promotion_certificate', title: 'Grade 10 promotion certificate', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 10 → 11', year: '2022–23', date: '2023-06-26', status: 'verified', category: 'academic' },
  { id: 'DOC-07', kind: 'marksheet', title: 'Grade 11 marksheet (American curriculum)', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 11', year: '2023–24', date: '2024-06-20', status: 'verified', category: 'academic',
    subjects: SUBJ([['AP Chemistry', 'B+', 'US letter', 88, 1], ['Pre-Calculus', 'A', 'US letter', 95, 1], ['English 11', 'A-', 'US letter', 91, 1], ['US History', 'B+', 'US letter', 88, 1], ['Arabic', 'A-', 'US letter', 91, 1], ['Moral Education / UAE Social Studies', 'Pass', 'Pass/Fail', null, 0]]),
    summary: 'GPA 3.60 / 4.0 · 5.0 Carnegie credits' },
  { id: 'DOC-08', kind: 'transfer_certificate', title: 'Transfer certificate (Grade 11 completed)', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 11', year: '2023–24', date: '2024-06-28', status: 'verified', category: 'academic',
    notes: 'Signed and stamped by the school; attested by the education authority of the issuing emirate (SPEA). E-attestation route to be confirmed.', validate: true },
  { id: 'DOC-09', kind: 'curriculum_approval', title: 'Curriculum-change approval: American to British (Grade 11 to 12)', school: 'SCH-3', issuer: 'UAE Ministry of Education (demo)', authority: 'MOE', curriculum: 'American → British', grade: 'Grade 12', year: '2024–25', date: '2024-07-15', status: 'verified', category: 'academic',
    notes: 'Requested because the move is within Grades 9–12. Exact requirements must be confirmed with MOE.', validate: true },
  { id: 'DOC-10', kind: 'enrollment_confirmation', title: 'School enrollment confirmation', school: 'SCH-3', issuer: 'Sample British School, Dubai', authority: 'KHDA', curriculum: 'British (A Level)', grade: 'Grade 12 (Year 13)', year: '2024–25', date: '2024-08-28', status: 'verified', category: 'academic',
    notes: 'Registration and enrollment steps with KHDA, where applicable. To be confirmed with KHDA.', validate: true },
  { id: 'DOC-11', kind: 'report', title: 'Grade 12 interim report (Term 1)', school: 'SCH-3', issuer: 'Sample British School, Dubai', authority: 'KHDA', curriculum: 'British (A Level)', grade: 'Grade 12 (Year 13)', year: '2024–25', date: '2024-12-12', status: 'verified', category: 'academic',
    subjects: SUBJ([['A Level Physics', 'A (predicted)', 'A Level A*–E'], ['A Level Mathematics', 'A* (predicted)', 'A Level A*–E'], ['A Level Chemistry', 'B (predicted)', 'A Level A*–E'], ['Arabic', 'Good progress', 'School descriptor'], ['Moral Education', 'Pass', 'Pass/Fail']]),
    summary: 'Interim only. Not for equivalency.' },
  { id: 'DOC-12', kind: 'enrollment_confirmation', title: 'University enrollment confirmation', school: 'UNI-1', issuer: 'Al Noor University', authority: 'MOHESR-licensed', curriculum: 'BSc Engineering (credit hours)', grade: 'Year 1', year: '2025–26', date: '2025-08-25', status: 'verified', category: 'academic' },
  { id: 'DOC-13', kind: 'transcript', title: 'University transcript (Year 1)', school: 'UNI-1', issuer: 'Al Noor University', authority: 'MOHESR-licensed', curriculum: 'BSc Engineering (credit hours)', grade: 'Year 1', year: '2025–26', date: '2026-06-30', status: 'verified', category: 'academic',
    subjects: SUBJ([['ENGR 101 Introduction to Engineering', 'A', 'US letter / 4.0', null, 3], ['MATH 121 Calculus I', 'A-', 'US letter / 4.0', null, 4], ['MATH 122 Calculus II', 'B+', 'US letter / 4.0', null, 4], ['PHYS 111 Physics I', 'B+', 'US letter / 4.0', null, 4], ['CHEM 101 General Chemistry', 'A-', 'US letter / 4.0', null, 4], ['ENGL 101 Academic Writing', 'A', 'US letter / 4.0', null, 3], ['UAE 100 UAE Studies', 'A', 'US letter / 4.0', null, 3], ['CS 110 Programming for Engineers', 'A', 'US letter / 4.0', null, 3], ['ENGR 140 Engineering Drawing', 'B', 'US letter / 4.0', null, 2], ['ISLM 101 Islamic Culture', 'A-', 'US letter / 4.0', null, 2]]),
    summary: '32 credit hours completed · cumulative GPA 3.62 / 4.0' },
  { id: 'DOC-15', kind: 'promotion_certificate', title: 'Grade 11 promotion certificate', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 11 → 12', year: '2023–24', date: '2024-06-25', status: 'verified', category: 'academic' },
  { id: 'DOC-16', kind: 'equivalency', title: 'Grade 12 equivalency certificate', school: 'SCH-3', issuer: 'UAE Ministry of Education (demo)', authority: 'MOE', curriculum: 'British (A Level)', grade: 'Grade 12', year: '2024–25', date: '2025-07-30', status: 'verified', category: 'academic',
    notes: 'Needed for graduates of non-MOE curricula (per the transfer pack). Requirements must be confirmed with MOE.', validate: true },
  { id: 'DOC-17', kind: 'external_exam', title: 'AP Chemistry exam: score 4', school: null, issuer: 'College Board (external issuer, demo)', authority: 'Foreign issuer: supporting evidence', curriculum: 'Advanced Placement', grade: 'Grade 11', year: '2023–24', date: '2024-07-10', status: 'verified', category: 'academic',
    subjects: SUBJ([['AP Chemistry', '4', 'AP 1–5']]) },
  { id: 'DOC-18', kind: 'external_exam', title: 'SAT score report', school: null, issuer: 'College Board (external issuer, demo)', authority: 'Foreign issuer: supporting evidence', curriculum: 'SAT', grade: 'Grade 11', year: '2023–24', date: '2024-03-14', status: 'verified', category: 'academic',
    subjects: SUBJ([['Evidence-Based Reading and Writing', '680', '200–800'], ['Math', '710', '200–800'], ['Total', '1390', '400–1600']]) },
  { id: 'DOC-19', kind: 'achievement', title: 'National STEM competition: 2nd place (team robotics)', school: null, issuer: 'Sample Competition Organizer', authority: 'Competition organizer', curriculum: '—', grade: '—', year: '2024–25', date: '2025-02-20', status: 'verified', category: 'extracurricular',
    notes: 'Team of 4, robotics category.' },
  { id: 'DOC-20', kind: 'training', title: 'Training certificate: Python for Engineers (24 hours)', school: null, issuer: 'Future Skills Academy', authority: 'Training provider', curriculum: '—', grade: '—', year: '2025–26', date: '2026-01-28', status: 'verified', category: 'extracurricular',
    subjects: SUBJ([['Python fundamentals', 'Pass', 'Pass/Fail'], ['Data analysis with pandas', 'Pass', 'Pass/Fail'], ['Final project', 'Distinction', 'Pass / Merit / Distinction']]) },
  { id: 'DOC-21', kind: 'leadership', title: 'Leadership letter: Robotics club captain', school: 'SCH-2', issuer: 'Sample American School, Sharjah', authority: 'SPEA', curriculum: 'American (US Common Core)', grade: 'Grade 11', year: '2023–24', date: '2024-06-15', status: 'verified', category: 'extracurricular' },
  { id: 'DOC-14', kind: 'volunteering', title: 'Volunteering record: community STEM mentor', school: null, issuer: 'Sample National Volunteering Platform', authority: 'Volunteering platform', curriculum: '—', grade: '—', year: '2024–2026', date: '2026-03-31', status: 'verified', category: 'extracurricular',
    notes: '62 verified volunteering hours.' },
];

const STAGE = (n, title, date, owner, detail, items, validate) => ({ n, title, date, owner, detail, items: items || [], validate: !!validate, done: true });
const IT = (id, name, status, purpose, doc, validate) => ({ id, name, status, purpose, doc: doc || null, validate: !!validate });
const schoolTransfer = () => ({
  id: 'TR-SCH-2024', type: 'school', title: 'School transfer: SPEA (Sharjah) to KHDA (Dubai)', status: 'completed', started: '2024-05-20', completed: '2024-08-28',
  from: { school: 'Sample American School, Sharjah', authority: 'SPEA', emirate: 'Sharjah', curriculum: 'American (US Common Core)', grade: 'Completed Grade 11' },
  to: { school: 'Sample British School, Dubai', authority: 'KHDA', emirate: 'Dubai', curriculum: 'British (A Level)', grade: 'Grade 12 (Year 13)' },
  placement: 'Grade placement was subject to the receiving school’s assessment and applicable approvals.',
  stages: [
    STAGE(1, 'Sara initiates the transfer', '2024-05-20', 'Sara', 'Sara asked Tayseer to prepare a transfer pack for Sample British School, Dubai.', [IT('i1', 'Transfer request (learner consent)', 'verified', 'Shows that Sara (and her guardian, as she was a minor) consented to sharing her records with the receiving school.')]),
    STAGE(2, 'Previous school prepares the transfer certificate', '2024-06-28', 'Sample American School, Sharjah', 'The school issued a transfer certificate showing the last grade completed.', [IT('i2', 'Transfer certificate (Grade 11 completed)', 'verified', 'The transfer pack lists a transfer certificate as required for a school move.', 'DOC-08')]),
    STAGE(3, 'Previous academic records and marksheets are attached', '2024-06-28', 'Sample American School, Sharjah', 'Marksheets keep their original grades and scale.', [IT('i3', 'Grade 10 marksheet', 'verified', 'Academic history for placement.', 'DOC-05'), IT('i4', 'Grade 11 marksheet', 'verified', 'Most recent completed grade.', 'DOC-07'), IT('i5', 'Grade 10 promotion certificate', 'verified', 'Confirms progression between grades.', 'DOC-06'), IT('i6', 'Earlier curriculum-change approval (CBSE to American)', 'verified', 'Shows the earlier move between curricula was approved.', 'DOC-03')]),
    STAGE(4, 'Issuing school verifies and signs the records', '2024-07-01', 'Sample American School, Sharjah', 'The school signed and stamped the transfer certificate and records.', [IT('i7', 'School signature and stamp', 'verified', 'The pack states the transfer certificate is signed and stamped by the school.')]),
    STAGE(5, 'Sharjah authority attestation is checked', '2024-07-08', 'SPEA (Sharjah)', 'Attestation by the education authority of the issuing emirate. The e-attestation route must be confirmed with SPEA.', [IT('i8', 'SPEA attestation: first upload', 'rejected', 'The first scan was unreadable, so it was rejected and re-submitted. The rejected copy stays in the history.'), IT('i9', 'SPEA attestation: re-submitted copy', 'verified', 'Attestation of the transfer certificate by the issuing emirate’s authority.', null, true)], true),
    STAGE(6, 'Curriculum-change requirements are identified', '2024-07-09', 'Tayseer checklist (demo)', 'American to British during Grades 9–12 counts as a curriculum change in the transfer pack, so MOE approval applies.', [IT('i10', 'Curriculum-change check', 'verified', 'Identifies whether MOE approval is needed. The rule here comes from the transfer pack and must be confirmed with MOE.', null, true)], true),
    STAGE(7, 'MOE approval is requested where applicable', '2024-07-15', 'UAE Ministry of Education', 'Approval requested for the move from American to British curriculum in Grade 12.', [IT('i11', 'Curriculum-change approval (American to British)', 'verified', 'MOE approval for a Grade 9–12 curriculum change.', 'DOC-09', true)], true),
    STAGE(8, 'Receiving Dubai school reviews the documents', '2024-08-05', 'Sample British School, Dubai', 'The receiving school reviewed the pack and assessed grade placement.', [IT('i12', 'Placement assessment', 'verified', 'The receiving school decides grade placement after its own assessment.'), IT('i13', 'Passport / Emirates ID copy', 'na', 'Not stored in Tayseer. The school collects identity documents directly.')]),
    STAGE(9, 'KHDA registration and enrollment steps are completed', '2024-08-20', 'Sample British School, Dubai / KHDA', 'Registration steps with the Dubai authority, where applicable. To be confirmed with KHDA.', [IT('i14', 'KHDA registration step', 'verified', 'Registration of the student with the Dubai education authority, where applicable.', null, true)], true),
    STAGE(10, 'New enrollment is confirmed', '2024-08-28', 'Sample British School, Dubai', 'Enrollment confirmed for Grade 12 (Year 13).', [IT('i15', 'School enrollment confirmation', 'verified', 'Confirms Sara’s place at the receiving school.', 'DOC-10')]),
    STAGE(11, 'New school and curriculum appear on the learner card', '2024-08-28', 'Tayseer', 'The card showed Sample British School, Dubai (British curriculum). The Sharjah school stayed in Previous education.', []),
  ],
});
const uniTransfer = () => ({
  id: 'TR-UNI-2026', type: 'university', title: 'University transfer: UAE national university to UK-based institution', status: 'in_progress', started: '2026-09-15', completed: null,
  from: { school: 'Al Noor University (UAE national university)', authority: 'MOHESR-licensed', emirate: 'Abu Dhabi', curriculum: 'BSc Engineering (US-style credit hours, 4.0 GPA)', grade: 'Year 1 completed (2025–26), Year 2 in progress' },
  to: { school: 'Sample UK University, Dubai campus (UK-based institution, demo)', authority: 'UK degree-awarding body; UAE licensing to be confirmed', emirate: 'Dubai', curriculum: 'BEng (Hons) Engineering (UK-style modules and credits)', grade: 'Placement to be decided by the receiving university' },
  credits: { completed: 32, unit: 'credit hours', gpa: '3.62 / 4.0', scale: 'US letter grades, 4.0 GPA', transcript: 'DOC-13' },
  steps: [
    { n: 1, title: 'Sara requests the transfer', status: 'done', date: '2026-09-15' },
    { n: 2, title: 'Previous university issues transcript and course descriptions', status: 'active', date: null },
    { n: 3, title: 'Sara submits the application and documents', status: 'active', date: null },
    { n: 4, title: 'Receiving university assesses credits', status: 'waiting', date: null },
    { n: 5, title: 'Receiving university decides placement and offer', status: 'waiting', date: null },
    { n: 6, title: 'New enrollment confirmed', status: 'waiting', date: null },
  ],
  groups: [
    { who: 'sara', title: 'Documents Sara must submit', items: [
      IT('u1', 'Transfer application form', 'awaiting', 'The receiving university’s own application. Sara submitted it; the university is checking it.'),
      IT('u2', 'Personal statement', 'required', 'Explains why Sara wants to transfer. Required by the receiving university.'),
      IT('u3', 'Passport / Emirates ID copy', 'na', 'Not stored in Tayseer. Sent directly to the university.') ] },
    { who: 'previous', title: 'Documents the previous university issues', items: [
      IT('u4', 'Official transcript (Year 1)', 'verified', 'Original modules, grades and grading scale, issued by Al Noor University.', 'DOC-13'),
      IT('u5', 'Course descriptions and syllabi', 'required', 'Lets the receiving university compare learning outcomes module by module.'),
      IT('u6', 'Letter of good standing', 'uploaded', 'Confirms Sara is in good academic standing. Uploaded; waiting for the issuer’s signature check.') ] },
    { who: 'receiving', title: 'What the receiving university must assess', items: [
      IT('u7', 'Credit transfer assessment', 'awaiting', 'Module-by-module comparison of learning outcomes and credit.'),
      IT('u8', 'English language evidence', 'awaiting', 'Whether previous study in English is accepted is the receiving university’s decision.') ] },
  ],
  decisions: ['Which modules are recognised, and at what credit value', 'Year or level placement', 'Whether Sara receives an offer', 'Any outstanding requirements or bridging modules'],
  assessment: [
    { module: 'MATH 121 Calculus I (4 cr, A-)', result: 'accepted', note: 'Recognised by the receiving university against Engineering Mathematics 1 (provisional decision).' },
    { module: 'PHYS 111 Physics I (4 cr, B+)', result: 'accepted', note: 'Recognised by the receiving university (provisional decision).' },
    { module: 'UAE 100 UAE Studies (3 cr, A)', result: 'not_accepted', note: 'Institution-specific requirement; no equivalent module. Not counted towards the new programme.' },
    { module: 'ENGR 140 Engineering Drawing (2 cr, B)', result: 'pending', note: 'Waiting for the syllabus.' },
    { module: 'MATH 122 Calculus II (4 cr, B+)', result: 'pending', note: 'Waiting for the syllabus.' },
  ],
  outstanding: ['Submit the personal statement', 'Request course descriptions and syllabi from Al Noor University', 'Receiving university to complete the credit assessment'],
  note: 'Tayseer does not convert credits or predict acceptance. Credit recognition and equivalency are the receiving university’s academic decision.',
});

// Demo cohort for teacher / advisor dashboards. auth = what each learner authorised for each role.
const COHORT = [
  { ref: 'ULL-2026-0048214', name: 'Omar K. (demo)', school: 'Al Noor University', curriculum: 'BSc Computer Science (credit hours)', grade: 'Year 3', status: 'Good standing', auth: { teacher: true, advisor: ['academic', 'extracurricular'] },
    timeline: [['2016–2023', 'Sample Emirati Public School, Ajman', 'MOE curriculum, Grades 1–12'], ['2024-08-25', 'Enrolled at Al Noor University', 'BSc Computer Science'], ['2026-06-30', 'Year 2 transcript issued', 'GPA 3.41 / 4.0']],
    records: [['Enrollment, BSc Computer Science', 'Al Noor University', 'academic', '2024-08-25'], ['Year 2 transcript', 'Al Noor University', 'academic', '2026-06-30'], ['Hackathon finalist', 'Sample Tech Challenge', 'extracurricular', '2026-04-12']] },
  { ref: 'ULL-2026-0048215', name: 'Mariam H. (demo)', school: 'Al Noor University', curriculum: 'BSc Architecture (credit hours)', grade: 'Year 1', status: 'Good standing', auth: { teacher: true, advisor: ['academic'] },
    timeline: [['2014–2025', 'Sample IB School, Abu Dhabi', 'IB Diploma'], ['2025-08-25', 'Enrolled at Al Noor University', 'BSc Architecture']],
    records: [['IB Diploma (34 points)', 'Sample IB School, Abu Dhabi', 'academic', '2025-07-05'], ['Enrollment, BSc Architecture', 'Al Noor University', 'academic', '2025-08-25'], ['Design competition, 1st place', 'Sample Design Council', 'extracurricular', '2025-03-02']] },
  { ref: 'ULL-2026-0048216', name: 'Daniel R. (demo)', school: 'Al Noor University', curriculum: 'BSc Mechanical Engineering (credit hours)', grade: 'Year 2', status: 'Academic warning', auth: { teacher: true, advisor: null },
    timeline: [['2013–2024', 'Sample British School, Dubai', 'British (A Level)'], ['2024-08-25', 'Enrolled at Al Noor University', 'BSc Mechanical Engineering']],
    records: [['Enrollment, BSc Mechanical Engineering', 'Al Noor University', 'academic', '2024-08-25'], ['Year 1 transcript', 'Al Noor University', 'academic', '2025-06-30']] },
];
module.exports = { LEARNER, schools, docs, schoolTransfer, uniTransfer, COHORT };
