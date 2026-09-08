import { isSubmissionId } from '../../src/lib/intake.ts'
import { jsonResponse, uploadResumeToTwenty, webhookForAudience, type Env, type IntakePayload } from './index.ts'

type Receipt = {
  submissionId: string
  fingerprint: string
  status: 'processing' | 'completed' | 'failed' | 'needs_review'
  createdAt: number
  runId?: string
  payload?: IntakePayload
}

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const CHECK_WINDOW_MS = 60 * 60 * 1000

// One object per random submission ID serializes delivery and retains its outcome.
// IDs are unguessable receipt capabilities. Public responses contain no form data.
export class IntakeReceipt {
  private ctx: DurableObjectState
  private env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  private response(receipt: Receipt) {
    const messages = {
      processing: 'Received. Your submission is still being processed. You can check its status below.',
      completed: 'Received. We will contact you shortly.',
      failed: 'Your submission could not be fully processed. Please contact kunal@microalchemy.xyz with the reference below. Do not submit it again.',
      needs_review: 'We could not confirm completion. Please contact kunal@microalchemy.xyz with the reference below. Do not submit it again.',
    }
    return jsonResponse({
      ok: true,
      submissionId: receipt.submissionId,
      status: receipt.status,
      message: messages[receipt.status],
    }, receipt.status === 'processing' ? 202 : 200)
  }

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === '/status') {
      const receipt = await this.ctx.storage.get<Receipt>('receipt')
      return receipt ? this.response(receipt) : jsonResponse({ message: 'No receipt found.' }, 404)
    }
    const form = await request.formData()
    const payload = JSON.parse(String(form.get('payload'))) as IntakePayload
    const file = form.get('resume')
    const resumeHash = file instanceof File
      ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).join(',') : ''
    const { submittedAt: _submittedAt, ...stablePayload } = payload
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(JSON.stringify(stablePayload) + resumeHash)))).join(',')
    const candidate: Receipt = {
      submissionId: payload.submissionId,
      fingerprint,
      status: 'processing',
      createdAt: Date.now(),
      payload,
    }
    const existing = await this.ctx.storage.transaction(async (txn) => {
      const previous = await txn.get<Receipt>('receipt')
      if (previous) return previous
      await txn.put('receipt', candidate)
      await txn.setAlarm(Date.now() + 60000)
      return undefined
    })
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return jsonResponse({ message: 'This reference already belongs to a different submission. Check its status before starting another.' }, 409)
      }
      return this.response(existing)
    }

    // Persist before each external side effect. An ambiguous network failure must
    // never automatically re-trigger a workflow that might already be sending mail.
    try {
      if (payload.audience === 'applicant') {
        await uploadResumeToTwenty(form, payload, this.env)
        await this.ctx.storage.put('receipt', candidate)
      }
      const response = await fetch(webhookForAudience(payload.audience, this.env), {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.env.TWENTY_API_KEY}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })
      const result = await response.json() as { success?: boolean; workflowRunId?: string }
      if (!response.ok || result.success !== true || !isSubmissionId(result.workflowRunId)) {
        throw new Error(`Invalid workflow acknowledgement (${response.status})`)
      }
      candidate.runId = result.workflowRunId
      await this.ctx.storage.put('receipt', candidate)
      await this.ctx.storage.setAlarm(Date.now() + 2000)
      console.info('Intake workflow accepted', { submissionId: candidate.submissionId, runId: candidate.runId })
    } catch (error) {
      candidate.status = 'needs_review'
      await this.ctx.storage.put('receipt', candidate)
      await this.ctx.storage.setAlarm(candidate.createdAt + RETENTION_MS)
      console.error('Intake delivery needs review', {
        submissionId: candidate.submissionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    return this.response(candidate)
  }

  async alarm() {
    const receipt = await this.ctx.storage.get<Receipt>('receipt')
    if (!receipt) return
    if (Date.now() >= receipt.createdAt + RETENTION_MS) {
      await this.ctx.storage.deleteAll()
      return
    }
    if (receipt.status === 'processing' && receipt.runId) {
      try {
        const url = new URL(`/rest/workflowRuns/${receipt.runId}`, this.env.TWENTY_API_URL)
        url.searchParams.set('depth', '0')
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${this.env.TWENTY_API_KEY}` },
          redirect: 'manual',
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) throw new Error(`Workflow status returned ${response.status}`)
        const result = await response.json() as { data?: { workflowRun?: { status?: string } } }
        const status = result.data?.workflowRun?.status
        if (!status) throw new Error('Missing workflow status')
        if (status === 'COMPLETED') receipt.status = 'completed'
        if (['FAILED', 'STOPPED'].includes(status)) receipt.status = 'failed'
      } catch (error) {
        console.error('Intake status check failed', {
          submissionId: receipt.submissionId,
          runId: receipt.runId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    if (receipt.status === 'processing'
      && (!receipt.runId || Date.now() >= receipt.createdAt + CHECK_WINDOW_MS)) {
      receipt.status = 'needs_review'
    }
    if (receipt.status !== 'processing') {
      console[receipt.status === 'completed' ? 'info' : 'error']('Intake workflow outcome', {
        submissionId: receipt.submissionId, runId: receipt.runId, status: receipt.status,
      })
      if (receipt.status === 'completed') delete receipt.payload
    }
    await this.ctx.storage.put('receipt', receipt)
    await this.ctx.storage.setAlarm(receipt.status === 'processing'
      ? Date.now() + Math.min(60000, Math.max(3000, (Date.now() - receipt.createdAt) / 3))
      : receipt.createdAt + RETENTION_MS)
  }
}
