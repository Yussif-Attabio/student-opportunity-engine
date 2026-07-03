import type { Opportunity, StudentProfile } from '../types'
import type { MatchResult } from './matching'

export interface Guidance {
  why: string
  nextStep: string
  highlights: string[]
  tip: string
}

// Lightweight, local guidance generator. No external APIs.
export const generateGuidance = (
  opp: Opportunity,
  profile: StudentProfile,
  match: MatchResult,
  resumeHighlights: string[] = []
): Guidance => {
  const normalizedResumeHighlights = resumeHighlights
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  // Why apply
  const whyParts: string[] = []
  if (match.matchScore >= 80) {
    whyParts.push(`Strong fit (${match.matchScore}%). Matches your profile and goals.`)
  } else if (match.matchScore >= 60) {
    whyParts.push(`Good fit (${match.matchScore}%). Worth applying if interested.`)
  } else {
    whyParts.push(`Potential fit (${match.matchScore}%). Consider applying if you can highlight transferable skills.`)
  }
  if (opp.compensation) whyParts.push(`Offers ${opp.compensation}.`)
  if (opp.duration) whyParts.push(`Duration: ${opp.duration}.`)
  const matchedResumeSkills = opp.requiredSkills.filter((skill) =>
    normalizedResumeHighlights.some(
      (highlight) =>
        highlight === skill.toLowerCase() ||
        highlight.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(highlight)
    )
  )
  if (matchedResumeSkills.length > 0) {
    whyParts.push('Your resume highlights already line up with key requirements.')
  }

  const why = whyParts.join(' ')

  // Suggested next step
  let nextStep = opp.applicationStep || 'Review application instructions and prepare materials.'
  // make next step a little action-oriented
  if (opp.type === 'career_event' || opp.type === 'hackathon') {
    nextStep = 'Register for the event and confirm logistics; prepare a short pitch.'
  } else if (opp.type === 'internship' || opp.type === 'research') {
    nextStep = `Tailor your resume to the role and reach out to ${opp.source} or the contact listed.`
  }

  // What to highlight
  const highlights: string[] = []
  // skills intersection
  const matchedSkills = opp.requiredSkills.filter((s) => profile.skills.some((ps) => ps.toLowerCase() === s.toLowerCase()))
  if (matchedSkills.length > 0) highlights.push(`Skills: ${matchedSkills.slice(0, 3).join(', ')}`)

  // majors
  if (opp.relatedMajors.some((m) => m.toLowerCase() === profile.major.toLowerCase() || m.toLowerCase() === 'all majors')) {
    highlights.push(`Relevant coursework or projects in ${profile.major}`)
  }

  // tags / interests
  const matchedTags = opp.tags.filter((t) => profile.interests.some((i) => t.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(t.toLowerCase())))
  if (matchedTags.length > 0) highlights.push(`Interests: ${matchedTags.slice(0, 3).join(', ')}`)
  if (matchedResumeSkills.length > 0) {
    highlights.push(`Resume highlights: ${matchedResumeSkills.slice(0, 2).join(', ')}`)
  }

  if (highlights.length === 0) {
    // fallback suggestions
    highlights.push('Relevant project or class experience')
    highlights.push('Transferable technical or teamwork skills')
  }

  // Short resume/cover tip
  const keywords = Array.from(new Set([...(opp.requiredSkills || []), ...(opp.tags || [])])).slice(0, 5)
  const resumeKeywordHint =
    matchedResumeSkills.length > 0
      ? ` Mention highlights like ${matchedResumeSkills.slice(0, 2).join(', ')} with a concrete project example.`
      : ''
  const tip = `Use keywords like ${keywords.join(', ')} where accurate; quantify impact (e.g., "improved X by Y"). Keep it concise.${resumeKeywordHint}`

  return {
    why,
    nextStep,
    highlights: highlights.slice(0, 3),
    tip
  }
}
