export type OpportunityType =
  | 'job'
  | 'internship'
  | 'scholarship'
  | 'research'
  | 'campus_job'
  | 'hackathon'
  | 'competition'
  | 'fellowship'
  | 'career_event'

export type AcademicYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate'

export interface StudentProfile {
  id: string
  name: string
  school: string
  major: string
  year: AcademicYear
  interests: string[]
  skills: string[]
  preferredOpportunityTypes: OpportunityType[]
  locationPreference: string
  availability: string
  shortTermGoal: string
  longTermGoal: string
  savedOpportunities: string[]
}

export interface Opportunity {
  id: string
  title: string
  type: OpportunityType
  source: string
  location: string
  deadline: string
  description: string
  requiredSkills: string[]
  relatedMajors: string[]
  tags: string[]
  applicationStep: string
  applicationUrl?: string
  postedDate: string
  compensation?: string
  duration?: string
}
