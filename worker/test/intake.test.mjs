import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import worker, { IntakeReceipt } from '../src/index.ts'
import { normalizePhone, optionalDate } from '../../src/lib/intake.ts'

const runId = '33333333-3333-4333-8333-333333333333'
const submissionId = '11111111-1111-4111-8111-111111111111'
const originalFetch = globalThis.fetch
let calls, objects, env, workflowStatus, webhookBody, webhookStatus

class Storage {
  data = new Map()
  alarm = null
  async get(key) { return structuredClone(this.data.get(key)) }
  async put(key, value) { this.data.set(key, structuredClone(value)) }
  async setAlarm(value) { this.alarm = value }
  async deleteAll() { this.data.clear(); this.alarm = null }
  async transaction(callback) { return callback(this) }
}

beforeEach(() => {
  calls = []
  objects = new Map()
  workflowStatus = 'COMPLETED'
  webhookStatus = 200
  webhookBody = { success: true, workflowRunId: runId }
  env = {
    ALLOWED_ORIGINS: 'https://microalchemy.xyz', TURNSTILE_SECRET_KEY: 'test-secret',
    TWENTY_API_KEY: 'test-key', TWENTY_API_URL: 'https://crm.example.test',
    TWENTY_RESUME_FIELD_UNIVERSAL_IDENTIFIER: 'test-field',
    TWENTY_APPLICANT_WEBHOOK_URL: 'https://crm.example.test/applicant',
    TWENTY_CUSTOMER_WEBHOOK_URL: 'https://crm.example.test/customer',
    TWENTY_INVESTOR_WEBHOOK_URL: 'https://crm.example.test/investor',
    INTAKE_RECEIPTS: {
      idFromName: (id) => id,
      get(id) {
        if (!objects.has(id)) {
          const storage = new Storage()
          objects.set(id, { storage, object: new IntakeReceipt({ storage }, env) })
        }
        return { fetch: (request) => objects.get(id).object.fetch(typeof request === 'string' ? new Request(request) : request) }
      },
    },
  }
  globalThis.fetch = async (url, options = {}) => {
    const address = String(url)
    calls.push({ url: address, body: options.body })
    if (address.includes('siteverify')) return Response.json({ success: true, hostname: 'microalchemy.xyz' })
    if (address.endsWith('/metadata')) return Response.json({ data: { uploadFilesFieldFileByUniversalIdentifier: { id: runId } } })
    if (address.includes('/rest/workflowRuns/')) return Response.json({ data: { workflowRun: { status: workflowStatus } } })
    return typeof webhookBody === 'string' ? new Response(webhookBody, { status: webhookStatus }) : Response.json(webhookBody, { status: webhookStatus })
  }
})
afterEach(() => { globalThis.fetch = originalFetch })

function form(audience = 'applicant', overrides = {}) {
  const data = new FormData()
  const fields = { audience, submissionId, fullName: 'Intake Test', email: 'test@example.test',
    consent: 'yes', phone: '+1 416 555 0123', turnstileToken: 'test-token',
    role: 'founding-hardware-engineer', educationLevel: "Bachelor's degree",
    degreeFields: 'Electrical Engineering', experienceAreas: '3D printing',
    onsiteAvailability: 'Yes — local or willing to relocate', organization: 'Test Org',
    jobTitle: 'Partner', investorType: 'Angel investor', projectStage: 'Exploring an idea',
    timeline: 'Just exploring', interestAreas: 'Technical partnership', ...overrides }
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  if (audience === 'applicant') data.set('resume', new File(['%PDF-test'], 'test.pdf', { type: 'application/pdf' }))
  return data
}
async function submit(data = form(), config = env) {
  return worker.fetch(new Request('https://relay.example.test/submit', {
    method: 'POST', headers: { Origin: 'https://microalchemy.xyz' }, body: data,
  }), config)
}
const webhookCalls = () => calls.filter((call) => /\/(applicant|customer|investor)$/.test(call.url))

test('local phone requires country; international and country-selected numbers normalize', () => {
  assert.throws(() => normalizePhone('4165550123'), /country/)
  assert.equal(normalizePhone('4165550123', 'CA').primaryPhoneCallingCode, '+1')
  assert.equal(normalizePhone('+91 98765 43210').primaryPhoneCountryCode, 'IN')
  assert.throws(() => normalizePhone('123', 'CA'), /valid/)
  assert.equal(normalizePhone(''), undefined)
})
test('blank date is null and impossible dates are rejected', () => {
  assert.equal(optionalDate(''), null)
  assert.equal(optionalDate('2028-02-29'), '2028-02-29')
  assert.throws(() => optionalDate('2026-02-29'), /valid/)
})
for (const audience of ['applicant', 'customer', 'investor']) {
  test(`${audience}: acceptance is processing; only completed workflow is success`, async () => {
    const response = await submit(form(audience))
    assert.equal(response.status, 202)
    assert.equal((await response.json()).status, 'processing')
    const payload = JSON.parse(webhookCalls()[0].body)
    assert.equal(payload.phones.primaryPhoneCountryCode, 'CA')
    assert.equal(payload.consentStatus, 'PERMISSION_TO_RETAIN')
    if (audience === 'applicant') assert.equal(payload.startDate, null)
    const { object, storage } = objects.get(submissionId)
    await object.alarm()
    const result = await (await object.fetch(new Request('https://receipt/status'))).json()
    assert.equal(result.status, 'completed')
    assert.equal((await storage.get('receipt')).payload, undefined)
    assert.equal(JSON.stringify(result).includes('test@example.test'), false)
  })
}
test('invalid applicant phone is rejected before captcha, upload, or delivery', async () => {
  assert.equal((await submit(form('applicant', { phone: '4165550123' }))).status, 400)
  assert.equal(calls.length, 0)
})
test('missing destination and unsupported files are rejected before upload', async () => {
  assert.equal((await submit(form(), { ...env, TWENTY_APPLICANT_WEBHOOK_URL: '' })).status, 503)
  const data = form()
  data.set('resume', new File(['bad'], 'file.exe'))
  assert.equal((await submit(data)).status, 400)
  assert.equal(calls.length, 0)
})
test('retry uses existing receipt and does not upload or trigger twice', async () => {
  await submit()
  await submit()
  assert.equal(webhookCalls().length, 1)
  assert.equal(calls.filter((call) => call.url.endsWith('/metadata')).length, 1)
})
test('different data cannot overwrite an existing receipt', async () => {
  await submit()
  assert.equal((await submit(form('applicant', { fullName: 'Different Person' }))).status, 409)
  assert.equal(webhookCalls().length, 1)
})
test('workflow failure is retained and never retriggers emails on retry', async () => {
  await submit()
  workflowStatus = 'FAILED'
  const { object, storage } = objects.get(submissionId)
  await object.alarm()
  assert.equal((await storage.get('receipt')).status, 'failed')
  assert.ok((await storage.get('receipt')).payload.resume)
  assert.equal((await (await submit()).json()).status, 'failed')
  assert.equal(webhookCalls().length, 1)
})
for (const body of [{ success: false }, '<html>Login</html>']) {
  test(`invalid HTTP 200 acknowledgement is never success: ${JSON.stringify(body)}`, async () => {
    webhookBody = body
    assert.equal((await (await submit()).json()).status, 'needs_review')
    await submit()
    assert.equal(webhookCalls().length, 1)
  })
}
test('temporary workflow status error remains processing rather than false success', async () => {
  await submit()
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 })
  const { object, storage } = objects.get(submissionId)
  await object.alarm()
  assert.equal((await storage.get('receipt')).status, 'processing')
  assert.ok(storage.alarm > Date.now())
})
test('missing run after interruption becomes needs_review', async () => {
  await submit()
  const { object, storage } = objects.get(submissionId)
  const receipt = await storage.get('receipt')
  delete receipt.runId
  await storage.put('receipt', receipt)
  await object.alarm()
  assert.equal((await storage.get('receipt')).status, 'needs_review')
})
test('expired receipts are removed', async () => {
  await submit()
  const { object, storage } = objects.get(submissionId)
  const receipt = await storage.get('receipt')
  receipt.createdAt -= 8 * 24 * 60 * 60 * 1000
  await storage.put('receipt', receipt)
  await object.alarm()
  assert.equal(await storage.get('receipt'), undefined)
})
