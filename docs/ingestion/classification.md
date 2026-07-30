# AI classification

Deterministic student-positive and seniority-negative indicators run before AI and are
stored conservatively. They do not reject a role based only on its title.

Groq receives only normalized public opportunity content—never profiles, resumes, tokens,
or private student data. The classifier returns strict Zod-validated JSON containing
eligibility, type, experience, education, graduation years, majors, skills, workplace,
sponsorship, explicit deadline, summary, confidence, and evidence snippets.

Unknown facts stay null, `UNKNOWN`, or empty. A deadline is rejected unless its evidence
is explicit. Results are keyed by content hash and classifier version. They run only for
new or changed content, prior failures, a new version, or explicit admin reclassification.
