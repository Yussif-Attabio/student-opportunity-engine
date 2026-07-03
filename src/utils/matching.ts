import type { Opportunity, StudentProfile } from '../types'

export interface MatchResult {
  matchScore: number
  matchReasons: string[]
}

export const calculateMatch = (
  opportunity: Opportunity,
  profile: StudentProfile,
  resumeHighlights: string[] = []
): MatchResult => {
  const scores: number[] = []
  const reasons: string[] = []
  const normalizedResumeHighlights = resumeHighlights
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  // 1. Opportunity type match
  const typeMatch = profile.preferredOpportunityTypes.includes(opportunity.type)
  if (typeMatch) {
    scores.push(25)
    reasons.push(`${opportunity.type.replace('_', ' ')} is on your list`)
  } else {
    scores.push(5)
  }

  // 2. Major match
  const majorMatch = opportunity.relatedMajors.some(
    (major) => major.toLowerCase() === 'all majors' || 
    major.toLowerCase() === profile.major.toLowerCase()
  )
  if (majorMatch) {
    scores.push(20)
    reasons.push(`Great for ${profile.major} students`)
  } else {
    scores.push(0)
  }

  // 3. Skill match
  const skillSignals = Array.from(
    new Set([
      ...profile.skills.map((skill) => skill.trim().toLowerCase()),
      ...normalizedResumeHighlights
    ])
  )
  const matchedSkills = opportunity.requiredSkills.filter((skill) =>
    skillSignals.some((signal) => signal === skill.toLowerCase())
  )
  const matchedResumeSkill = opportunity.requiredSkills.find((skill) =>
    normalizedResumeHighlights.some(
      (highlight) =>
        highlight === skill.toLowerCase() ||
        highlight.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(highlight)
    )
  )
  const skillMatchPercentage = Math.min(
    (matchedSkills.length / Math.max(opportunity.requiredSkills.length, 1)) * 20,
    20
  )
  scores.push(skillMatchPercentage)
  if (matchedSkills.length > 0) {
    reasons.push(`You have ${matchedSkills.length} required skill${matchedSkills.length > 1 ? 's' : ''}`)
  }
  if (matchedResumeSkill) {
    reasons.push(`Matches resume highlight: ${matchedResumeSkill}`)
  }

  // 4. Interest/Tag match
  const matchedTags = opportunity.tags.filter((tag) =>
    [...profile.interests, ...resumeHighlights].some(
      (interest) => tag.toLowerCase().includes(interest.toLowerCase()) ||
      interest.toLowerCase().includes(tag.toLowerCase())
    )
  )
  const hasResumeTagMatch = opportunity.tags.some((tag) =>
    normalizedResumeHighlights.some(
      (highlight) =>
        tag.toLowerCase().includes(highlight) ||
        highlight.includes(tag.toLowerCase())
    )
  )
  const tagMatchPercentage = Math.min(
    (matchedTags.length / Math.max(opportunity.tags.length, 1)) * 20,
    20
  )
  scores.push(tagMatchPercentage)
  if (matchedTags.length > 0) {
    reasons.push(`Aligns with your interests: ${matchedTags.slice(0, 2).join(', ')}`)
  }
  if (hasResumeTagMatch && !matchedResumeSkill) {
    reasons.push('Your resume highlights align with this opportunity')
  }

  // 5. Location preference match
  const locationMatch =
    opportunity.location.toLowerCase().includes(profile.locationPreference.toLowerCase()) ||
    profile.locationPreference.toLowerCase() === 'any' ||
    opportunity.location.toLowerCase() === 'on campus'
  if (locationMatch) {
    scores.push(15)
    reasons.push(`Located in your preferred area`)
  } else {
    scores.push(0)
  }

  const totalScore = Math.min(Math.round((scores.reduce((a, b) => a + b, 0) / 100) * 100), 100)

  return {
    matchScore: totalScore,
    matchReasons: reasons.slice(0, 3)
  }
}

export const getMatchColor = (score: number): string => {
  if (score >= 80) return '#388e3c' // Green - Excellent match
  if (score >= 60) return '#7cb342' // Light green - Good match
  if (score >= 40) return '#f57c00' // Orange - Fair match
  return '#9ca3af' // Gray - Low match
}

export const getMatchLabel = (score: number): string => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Low'
}
