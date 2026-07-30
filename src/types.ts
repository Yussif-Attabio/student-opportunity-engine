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

export type CareerField =
  | 'TECHNOLOGY'
  | 'ENGINEERING'
  | 'BUSINESS'
  | 'FINANCE_ACCOUNTING'
  | 'HEALTHCARE'
  | 'MARKETING_COMMUNICATIONS'
  | 'DESIGN_CREATIVE'
  | 'EDUCATION'
  | 'SCIENCE_RESEARCH'
  | 'LAW_GOVERNMENT_POLICY'
  | 'OPERATIONS_LOGISTICS'
  | 'HOSPITALITY'
  | 'SKILLED_TRADES'
  | 'OTHER'
  | 'UNKNOWN'

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
  country?: string
  careerField?: CareerField
  deadline: string
  description: string
  fullDescription?: string
  requiredSkills: string[]
  relatedMajors: string[]
  tags: string[]
  applicationStep: string
  applicationUrl?: string
  attribution?: {
    label: string
    url: string
  }
  postedDate: string
  compensation?: string
  duration?: string
}
