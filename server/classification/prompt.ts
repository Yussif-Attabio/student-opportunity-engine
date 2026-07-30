import type { opportunities } from '../db/schema/opportunities.js'

type Opportunity = typeof opportunities.$inferSelect

const OUTPUT_SHAPE = `{
  "studentEligible": {"value": true|false|null, "confidence": 0-1, "evidence": [{"snippet": "...", "explicit": true|false}]},
  "opportunityType": {"value": "INTERNSHIP|NEW_GRAD_JOB|CO_OP|FELLOWSHIP|SCHOLARSHIP|RESEARCH|APPRENTICESHIP|CAMPUS_PROGRAM|ROTATIONAL_PROGRAM|JOB|UNKNOWN", "confidence": 0-1, "evidence": []},
  "experienceLevel": {"value": "STUDENT|ENTRY_LEVEL|NEW_GRAD|MID_LEVEL|SENIOR|LEAD|MANAGER|EXECUTIVE|UNKNOWN", "confidence": 0-1, "evidence": []},
  "educationLevels": {"value": ["HIGH_SCHOOL|ASSOCIATE|BACHELOR|MASTER|DOCTORATE|OTHER|UNKNOWN"], "confidence": 0-1, "evidence": []},
  "eligibleGraduationYears": {"value": [2027], "confidence": 0-1, "evidence": []},
  "majors": {"value": ["Computer Science"], "confidence": 0-1, "evidence": []},
  "requiredSkills": {"value": ["Python"], "confidence": 0-1, "evidence": []},
  "preferredSkills": {"value": ["SQL"], "confidence": 0-1, "evidence": []},
  "remoteStatus": {"value": "REMOTE|HYBRID|ONSITE|FLEXIBLE|UNKNOWN", "confidence": 0-1, "evidence": []},
  "sponsorshipStatus": {"value": "AVAILABLE|NOT_AVAILABLE|RESTRICTED|NOT_STATED|UNKNOWN", "confidence": 0-1, "evidence": []},
  "applicationDeadline": {"value": "ISO-8601 timestamp"|null, "confidence": 0-1, "evidence": []},
  "studentFacingSummary": "..."
}`

export const buildClassificationPrompt = (opportunity: Opportunity): string => `
You classify public opportunities for students. Return only one JSON object in the exact shape below.

Rules:
- Never invent or assume missing facts. Use null, UNKNOWN, or [] when unclear.
- Evidence snippets must be exact short excerpts from the supplied posting.
- Set explicit=true only when the posting directly states the value; otherwise false.
- An application deadline may be non-null only when explicitly stated.
- Separate required skills from preferred skills.
- Do not reject a posting merely because the word "student" is absent.
- Consider the full description, not only the title.
- Recognize internships, co-ops, university/new graduate, early-career, entry-level,
  apprenticeships, fellowships, student research, campus and rotational programs.
- A student-facing summary must be concise and contain only supported facts.

Output shape:
${OUTPUT_SHAPE}

Posting:
Organization: ${opportunity.organizationName}
Title: ${opportunity.title}
Locations: ${opportunity.locations.join(', ') || 'Unknown'}
Provider remote status: ${opportunity.remoteStatus}
Provider opportunity type: ${opportunity.opportunityType}
Description:
${(opportunity.descriptionText ?? '').slice(0, 12_000)}
`.trim()
