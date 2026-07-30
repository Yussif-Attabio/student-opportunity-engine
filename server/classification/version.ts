export const CLASSIFICATION_PROMPT_VERSION = 'student-opportunity-classifier-v1'

export const getClassifierVersion = () =>
  process.env.CLASSIFIER_VERSION ?? 'student-opportunity-v1'
