import { Client } from '@upstash/qstash'

const token = process.env.QSTASH_TOKEN
const appUrl = process.env.APP_URL?.replace(/\/+$/, '')
const cronSecret = process.env.CRON_SECRET

if (!token || !appUrl || !cronSecret) {
  throw new Error('QSTASH_TOKEN, APP_URL, and CRON_SECRET are required')
}

const client = new Client({ token })
const destination = `${appUrl}/api/internal/cron/dispatch-sources`
const existing = (await client.schedules.list()).filter(
  (schedule) =>
    schedule.destination === destination ||
    schedule.labels?.includes('opportunity-source-dispatcher')
)

const result = await client.schedules.create({
  destination,
  scheduleId: existing[0]?.scheduleId,
  cron: '*/15 * * * *',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${cronSecret}`
  },
  retries: 5,
  failureCallback: `${appUrl}/api/internal/jobs/failure-callback`,
  label: 'opportunity-source-dispatcher',
  redact: { header: ['Authorization'] }
})

for (const duplicate of existing.slice(1)) {
  await client.schedules.delete(duplicate.scheduleId)
}

console.log(`Configured QStash source dispatcher schedule ${result.scheduleId}.`)
