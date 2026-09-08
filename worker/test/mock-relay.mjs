// Local-only browser fixture. Never calls Twenty or sends email.
// PUBLIC_INTAKE_API_URL=http://127.0.0.1:8788/submit npm run dev
import { createServer } from 'node:http'

const receipts = new Map()
createServer(async (request, response) => {
  const origin = request.headers.origin || ''
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    response.writeHead(403).end()
    return
  }
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  if (request.method === 'OPTIONS') { response.writeHead(204, headers).end(); return }
  if (request.method === 'GET') {
    response.writeHead(200, headers).end(JSON.stringify({ localMock: true, submissions: receipts.size }))
    return
  }
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  let result
  if (request.url === '/submit') {
    const form = await new Response(body, { headers: { 'Content-Type': request.headers['content-type'] } }).formData()
    const submissionId = form.get('submissionId')
    const status = form.get('audience') === 'investor' ? 'failed' : 'completed'
    receipts.set(submissionId, status)
    result = { ok: true, submissionId, status: 'processing', message: 'Local test: received and processing.' }
  } else {
    const { submissionId } = JSON.parse(body)
    const status = receipts.get(submissionId)
    if (!status) { response.writeHead(404, headers).end('{}'); return }
    result = { ok: true, submissionId, status, message: status === 'failed' ? 'Local test: workflow failed. Your form should remain filled.' : 'Local test: completed successfully.' }
  }
  response.writeHead(result.status === 'processing' ? 202 : 200, headers).end(JSON.stringify(result))
}).listen(8788, '127.0.0.1', () => console.log('Local mock relay: http://127.0.0.1:8788 (no external services)'))
