export const getJobSyncUserAgent = () =>
  process.env.JOB_SYNC_USER_AGENT ??
  'StudentOpportunityEngineBot/1.0 (+https://student-opportunity-engine.vercel.app)'
