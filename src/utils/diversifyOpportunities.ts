import type { Opportunity } from '../types.js'

const fieldOf = (opportunity: Opportunity) =>
  opportunity.careerField ?? 'UNKNOWN'

export const diversifyOpportunities = (
  opportunities: Opportunity[],
  score: (opportunity: Opportunity) => number
) => {
  const queues = new Map<string, Opportunity[]>()
  for (const opportunity of opportunities) {
    const field = fieldOf(opportunity)
    const queue = queues.get(field) ?? []
    queue.push(opportunity)
    queues.set(field, queue)
  }
  for (const queue of queues.values()) {
    queue.sort((left, right) => score(right) - score(left))
  }

  const result: Opportunity[] = []
  while (result.length < opportunities.length) {
    const active = [...queues.entries()]
      .filter(([, queue]) => queue.length > 0)
      .sort(([, left], [, right]) => score(right[0]!) - score(left[0]!))
    for (const [, queue] of active) {
      const opportunity = queue.shift()
      if (opportunity) result.push(opportunity)
    }
  }
  return result
}
