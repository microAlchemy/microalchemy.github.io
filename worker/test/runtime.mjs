import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import assert from 'node:assert/strict'

// Real workerd + SQLite + alarms, with every outbound service replaced locally.
const submissionId = '99999999-9999-4999-8999-999999999999'
let deliveries = 0
const runtime = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  scriptPath: 'worker/.wrangler/dry-run/index.js',
  compatibilityDate: '2026-09-01',
  durableObjects: { INTAKE_RECEIPTS: { className: 'IntakeReceipt', useSQLite: true } },
  bindings: {
    ALLOWED_ORIGINS: 'https://microalchemy.xyz', TURNSTILE_SECRET_KEY: 'mock',
    TWENTY_API_KEY: 'mock', TWENTY_API_URL: 'https://crm.example.test',
    TWENTY_INVESTOR_WEBHOOK_URL: 'https://crm.example.test/investor',
  },
  outboundService: async (request) => {
    if (request.url.includes('siteverify')) return Response.json({ success: true, hostname: 'microalchemy.xyz' })
    if (request.url.includes('/rest/workflowRuns/')) return Response.json({ data: { workflowRun: { status: 'COMPLETED' } } })
    assert.equal(request.url, 'https://crm.example.test/investor')
    deliveries++
    return Response.json({ success: true, workflowRunId: submissionId })
  },
}))
try {
  const submit = async () => {
    const form = new FormData()
    for (const [key, value] of Object.entries({ submissionId, audience: 'investor',
      fullName: 'Isolated Runtime Test', email: 'runtime@example.test', organization: 'Fixture',
      jobTitle: 'Partner', investorType: 'Angel investor', consent: 'yes', turnstileToken: 'mock' })) form.set(key, value)
    // Encode with Node's Request before crossing Miniflare's fetch implementation.
    const request = new Request('https://relay.example.test/submit', {
      method: 'POST', headers: { Origin: 'https://microalchemy.xyz' }, body: form,
    })
    return runtime.dispatchFetch(request.url, { method: 'POST', headers: Object.fromEntries(request.headers),
      body: new Uint8Array(await request.arrayBuffer()) })
  }
  const responses = await Promise.all([submit(), submit()])
  const results = await Promise.all(responses.map((response) => response.json()))
  assert.ok(results.every((result) => result.status === 'processing'), JSON.stringify(results))
  assert.equal(deliveries, 1, 'concurrent retries must deliver only once')
  let result
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const response = await runtime.dispatchFetch('https://relay.example.test/status', {
      method: 'POST', headers: { Origin: 'https://microalchemy.xyz', 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId }),
    })
    result = await response.json()
    if (result.status === 'completed') break
  }
  assert.equal(result.status, 'completed', 'durable alarm must observe workflow completion')
  assert.equal(deliveries, 1)
  console.log('PASS workerd: concurrent delivery, SQLite receipt, and completion alarm; all outbound services mocked.')
} finally {
  await runtime.dispose()
}
