import { isSubmissionId, normalizePhone, optionalDate } from '../../src/lib/intake.ts'

export interface Env {
  ALLOWED_ORIGINS: string
  TURNSTILE_SECRET_KEY: string
  TWENTY_API_URL: string
  TWENTY_API_KEY: string
  TWENTY_RESUME_FIELD_UNIVERSAL_IDENTIFIER: string
  TWENTY_APPLICANT_WEBHOOK_URL: string
  TWENTY_CUSTOMER_WEBHOOK_URL: string
  TWENTY_INVESTOR_WEBHOOK_URL: string
  INTAKE_RECEIPTS: DurableObjectNamespace
}

type Audience = 'applicant' | 'customer' | 'investor'

type TwentyFileValue = {
  fileId: string
  label: string
}

type TurnstileVerification = {
  success?: boolean
  hostname?: string
  'error-codes'?: string[]
}

export type IntakePayload = Record<string, unknown> & {
  schemaVersion: string
  submissionId: string
  submittedAt: string
  audience: Audience
}

const MAX_BODY_BYTES = 12 * 1024 * 1024
const MAX_RESUME_BYTES = 10 * 1024 * 1024
const allowedResumeExtensions = new Set(['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp'])
const allowedResumeMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/octet-stream',
  '',
])

const roleTitles: Record<string, string> = {
  'founding-software-engineer-eda': 'Founding Software Engineer - EDA Tool Design',
  'founding-semi-eng': 'Founding Engineer - Semiconductors',
  'founding-hardware-engineer': 'Founding Hardware Engineer',
}

class IntakeError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

const asString = (form: FormData, key: string, maxLength = 5000) => {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const asStrings = (form: FormData, key: string, maxItems = 30) => form
  .getAll(key)
  .filter((value): value is string => typeof value === 'string')
  .map((value) => value.trim().slice(0, 200))
  .filter(Boolean)
  .slice(0, maxItems)

const requireValue = (value: string, label: string) => {
  if (!value) throw new IntakeError(`${label} is required.`)
  return value
}

const parseAudience = (value: string): Audience => {
  if (value === 'applicant' || value === 'customer' || value === 'investor') return value
  throw new IntakeError('Choose a valid intake form.')
}

const parseName = (fullName: string) => {
  const parts = fullName.split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(' '),
  }
}

const emailDomain = (email: string) => email.split('@')[1]?.toLowerCase() ?? ''
const personalEmailDomains = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'yahoo.ca', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'msn.com'])

const safeFileName = (name: string) => {
  const normalized = name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
  return normalized.replace(/^[-.]+|[-.]+$/g, '').slice(0, 100) || 'resume.pdf'
}

const allowedOrigins = (env: Env) => new Set(
  (env.ALLOWED_ORIGINS || 'https://microalchemy.xyz')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
})

export const jsonResponse = (body: object, status: number, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? corsHeaders(origin) : {}),
  },
})

const verifyTurnstile = async (token: string, request: Request, env: Env) => {
  if (!env.TURNSTILE_SECRET_KEY) throw new IntakeError('Security verification is not configured.', 503)
  if (!token) throw new IntakeError('Complete the security verification before submitting.')

  const body = new FormData()
  body.set('secret', env.TURNSTILE_SECRET_KEY)
  body.set('response', token)
  const remoteIp = request.headers.get('CF-Connecting-IP')
  if (remoteIp) body.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(10000),
  })
  const result = await response.json() as TurnstileVerification
  if (response.ok && result.success) {
    const hostname = new URL(request.headers.get('Origin')!).hostname
    const localTest = ['localhost', '127.0.0.1'].includes(hostname)
      && env.TURNSTILE_SECRET_KEY === '1x0000000000000000000000000000000AA'
    if (!localTest && result.hostname !== hostname) throw new IntakeError('Security verification was issued for a different website.')
    return
  }

  const errorCodes = result['error-codes'] ?? []
  console.error('Turnstile verification failed', {
    responseStatus: response.status,
    errorCodes,
    hostname: result.hostname,
  })

  if (errorCodes.includes('missing-input-secret') || errorCodes.includes('invalid-input-secret')) {
    throw new IntakeError('Security verification is temporarily unavailable. Please try again later.', 503)
  }
  if (errorCodes.includes('timeout-or-duplicate')) {
    throw new IntakeError('Security verification expired. Complete it again and resubmit.')
  }
  if (errorCodes.includes('invalid-input-response') || errorCodes.includes('missing-input-response')) {
    throw new IntakeError('Security verification was not accepted. Complete it again and resubmit.')
  }
  throw new IntakeError('Security verification could not be completed. Please try again.', 503)
}

export const webhookForAudience = (audience: Audience, env: Env) => {
  if (audience === 'applicant') return env.TWENTY_APPLICANT_WEBHOOK_URL
  if (audience === 'customer') return env.TWENTY_CUSTOMER_WEBHOOK_URL
  return env.TWENTY_INVESTOR_WEBHOOK_URL
}

const buildPayload = (form: FormData, audience: Audience): IntakePayload => {
  const fullName = requireValue(asString(form, 'fullName', 120), 'Full name')
  const email = requireValue(asString(form, 'email', 180).toLowerCase(), 'Email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new IntakeError('Enter a valid email address.')
  if (asString(form, 'consent', 10) !== 'yes') throw new IntakeError('Consent is required.')

  const { firstName, lastName } = parseName(fullName)
  let phones
  let startDate
  try {
    phones = normalizePhone(asString(form, 'phone', 40), asString(form, 'phoneCountry', 2))
    startDate = optionalDate(asString(form, 'startDate', 20))
  } catch (error) {
    throw new IntakeError((error as Error).message)
  }
  const submissionId = asString(form, 'submissionId', 100) || crypto.randomUUID()
  if (!isSubmissionId(submissionId)) throw new IntakeError('Invalid submission reference. Reload the form.')
  const website = asString(form, 'website', 300)
  if (website) {
    try {
      if (!['https:', 'http:'].includes(new URL(website).protocol)) throw new Error()
    } catch { throw new IntakeError('Enter a website beginning with https:// or http://.') }
  }
  const payload: IntakePayload = {
    schemaVersion: '1',
    submissionId,
    submittedAt: new Date().toISOString(),
    audience,
    crmObject: audience === 'applicant' ? 'Applicant' : audience === 'customer' ? 'Opportunity' : 'Investor Interest',
    status: 'New',
    source: 'microalchemy.xyz intake form',
    sourcePath: asString(form, 'sourcePath', 500),
    timezone: asString(form, 'timezone', 100),
    fullName,
    firstName,
    lastName,
    email,
    emailDomain: emailDomain(email),
    companyDomain: !personalEmailDomains.has(emailDomain(email))
      ? { primaryLinkUrl: `https://${emailDomain(email)}` } : undefined,
    phone: phones ? `${phones.primaryPhoneCallingCode}${phones.primaryPhoneNumber}` : '',
    phones,
    website,
    profileLink: website ? { primaryLinkUrl: website, primaryLinkLabel: 'Submitted profile' } : undefined,
    consentStatus: 'PERMISSION_TO_RETAIN',
    organization: asString(form, 'organization', 180),
    jobTitle: asString(form, 'jobTitle', 120),
    details: asString(form, 'details', 5000),
    notifyEmails: ['kunal@microalchemy.xyz', 'aditya@microalchemy.xyz'],
    utmSource: asString(form, 'utm_source', 150),
    utmMedium: asString(form, 'utm_medium', 150),
    utmCampaign: asString(form, 'utm_campaign', 150),
    utmContent: asString(form, 'utm_content', 150),
    utmTerm: asString(form, 'utm_term', 150),
    resumeName: null,
    resume: null,
  }

  if (audience === 'applicant') {
    const role = requireValue(asString(form, 'role', 120), 'Role')
    const degreeFields = asStrings(form, 'degreeFields')
    const experienceAreas = asStrings(form, 'experienceAreas')
    if (!roleTitles[role]) throw new IntakeError('Choose a valid open role.')
    if (!degreeFields.length) throw new IntakeError('Select at least one degree field.')
    if (!experienceAreas.length) throw new IntakeError('Select at least one relevant experience area.')

    payload.role = role
    payload.roleTitle = roleTitles[role]
    payload.educationLevel = requireValue(asString(form, 'educationLevel', 120), 'Education level')
    payload.degreeFields = degreeFields
    payload.degreeFieldsText = degreeFields.join(', ')
    payload.experienceAreas = experienceAreas
    payload.experienceAreasText = experienceAreas.join(', ')
    payload.edaExperience = asString(form, 'edaExperience', 120)
    payload.labAccess = asString(form, 'labAccess', 1000)
    if (role !== 'founding-hardware-engineer') {
      payload.edaExperience = requireValue(payload.edaExperience as string, 'Open-source EDA experience')
    }
    payload.onsiteAvailability = requireValue(asString(form, 'onsiteAvailability', 120), 'On-site availability')
    payload.startDate = startDate
    payload.phone = requireValue(payload.phone as string, 'Phone number')
    payload.notificationSubject = `New applicant: ${fullName} — ${roleTitles[role]}`
  }

  if (audience === 'customer') {
    const interestAreas = asStrings(form, 'interestAreas')
    if (!interestAreas.length) throw new IntakeError('Select at least one area of interest.')
    payload.organization = requireValue(payload.organization as string, 'Company or organization')
    payload.interestAreas = interestAreas
    payload.interestAreasText = interestAreas.join(', ')
    payload.projectStage = requireValue(asString(form, 'projectStage', 120), 'Project stage')
    payload.timeline = requireValue(asString(form, 'timeline', 120), 'Timeline')
    payload.notificationSubject = `New customer interest: ${payload.organization} — ${interestAreas.join(', ')}`
  }

  if (audience === 'investor') {
    payload.organization = requireValue(payload.organization as string, 'Firm or organization')
    payload.jobTitle = requireValue(payload.jobTitle as string, 'Role')
    payload.investorType = requireValue(asString(form, 'investorType', 120), 'Investor type')
    payload.checkSize = asString(form, 'checkSize', 120)
    payload.notificationSubject = `New investor interest: ${fullName} — ${payload.organization}`
  }

  const detailLines = audience === 'applicant'
    ? [
        `Phone: ${payload.phone}`,
        payload.website ? `Profile: ${payload.website}` : '',
        `Role: ${payload.roleTitle}`,
        `Education: ${payload.educationLevel}`,
        `Degree fields: ${payload.degreeFieldsText}`,
        `Experience: ${payload.experienceAreasText}`,
        payload.edaExperience ? `Open-source EDA: ${payload.edaExperience}` : '',
        payload.labAccess ? `Lab access: ${payload.labAccess}` : '',
        `On-site availability: ${payload.onsiteAvailability}`,
        payload.startDate ? `Available from: ${payload.startDate}` : '',
      ]
    : audience === 'customer'
      ? [
          payload.jobTitle ? `Role: ${payload.jobTitle}` : '',
          `Interest: ${payload.interestAreasText}`,
          `Project stage: ${payload.projectStage}`,
          `Timeline: ${payload.timeline}`,
        ]
      : [
          `Role: ${payload.jobTitle}`,
          `Investor type: ${payload.investorType}`,
          payload.checkSize ? `Typical check: ${payload.checkSize}` : '',
        ]

  payload.notificationBody = [
    `Name: ${fullName}`,
    `Email: ${email}`,
    payload.organization ? `Organization: ${payload.organization}` : '',
    audience !== 'applicant' && payload.phone ? `Phone: ${payload.phone}` : '',
    audience !== 'applicant' && payload.website ? `Profile: ${payload.website}` : '',
    ...detailLines,
    payload.details ? `\nDetails:\n${payload.details}` : '',
  ].filter(Boolean).join('\n')

  return payload
}

const validateResume = (form: FormData) => {
  const file = form.get('resume')
  if (!(file instanceof File) || !file.size) throw new IntakeError('Attach your résumé before submitting.')
  if (file.size > MAX_RESUME_BYTES) throw new IntakeError('Your résumé must be 10 MB or smaller.')

  const name = safeFileName(file.name)
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (!allowedResumeExtensions.has(extension) || !allowedResumeMimeTypes.has(file.type)) {
    throw new IntakeError('Upload your résumé as a PDF, DOC, DOCX, PNG, JPEG, or WebP file.')
  }
  return { file, name }
}

export const uploadResumeToTwenty = async (form: FormData, payload: IntakePayload, env: Env) => {
  if (!env.TWENTY_API_URL || !env.TWENTY_API_KEY || !env.TWENTY_RESUME_FIELD_UNIVERSAL_IDENTIFIER) {
    throw new IntakeError('Résumé storage is not configured.', 503)
  }
  const { file, name } = validateResume(form)

  const apiUrl = new URL(env.TWENTY_API_URL)
  if (apiUrl.protocol !== 'https:') throw new IntakeError('Résumé storage is not configured.', 503)
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, '')}/metadata`

  const operations = {
    query: `mutation UploadFilesFieldFileByUniversalIdentifier($file: Upload!, $fieldMetadataUniversalIdentifier: String!) {
      uploadFilesFieldFileByUniversalIdentifier(
        file: $file
        fieldMetadataUniversalIdentifier: $fieldMetadataUniversalIdentifier
      ) {
        id
      }
    }`,
    variables: {
      file: null,
      fieldMetadataUniversalIdentifier: env.TWENTY_RESUME_FIELD_UNIVERSAL_IDENTIFIER,
    },
  }
  const uploadBody = new FormData()
  uploadBody.set('operations', JSON.stringify(operations))
  uploadBody.set('map', JSON.stringify({ 0: ['variables.file'] }))
  uploadBody.set('0', file, name)

  const response = await fetch(apiUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: { Authorization: `Bearer ${env.TWENTY_API_KEY}` },
    body: uploadBody,
    signal: AbortSignal.timeout(20000),
  })
  const result = await response.json() as {
    data?: { uploadFilesFieldFileByUniversalIdentifier?: { id: string } }
    errors?: Array<{ message?: string }>
  }
  const uploaded = result.data?.uploadFilesFieldFileByUniversalIdentifier
  if (!response.ok || !uploaded?.id) {
    console.error('Twenty résumé upload failed', response.status, result.errors?.map((error) => error.message))
    throw new IntakeError('We could not store your résumé. Please try again.', 502)
  }

  const resume: TwentyFileValue = {
    fileId: uploaded.id,
    label: name,
  }
  payload.resumeName = name
  payload.resume = [resume]
  payload.notificationBody = `${payload.notificationBody}\nRésumé: ${name}\nStored on the Application record in Twenty.`
}

const submitIntake = async (request: Request, env: Env, origin: string) => {
  const contentLength = Number(request.headers.get('Content-Length') || '0')
  if (contentLength > MAX_BODY_BYTES) throw new IntakeError('The submission is too large.', 413)
  if (!request.headers.get('Content-Type')?.includes('multipart/form-data')) {
    throw new IntakeError('Submit the intake form using multipart form data.', 415)
  }

  const form = await request.formData()
  if (asString(form, 'companyFax', 200)) return jsonResponse({ ok: true }, 200, origin)

  const audience = parseAudience(asString(form, 'audience', 20))
  const payload = buildPayload(form, audience)
  if (audience === 'applicant') {
    validateResume(form)
    if (!env.TWENTY_RESUME_FIELD_UNIVERSAL_IDENTIFIER) throw new IntakeError('Résumé storage is not configured.', 503)
  }
  const webhookUrl = webhookForAudience(audience, env)
  if (!webhookUrl || !env.TWENTY_API_KEY || !env.TWENTY_API_URL || !env.INTAKE_RECEIPTS) {
    throw new IntakeError('The CRM destination is not configured.', 503)
  }

  if (new URL(webhookUrl).origin !== new URL(env.TWENTY_API_URL).origin
    || new URL(webhookUrl).protocol !== 'https:') throw new IntakeError('The CRM destination is not configured.', 503)
  await verifyTurnstile(asString(form, 'turnstileToken', 2048), request, env)
  const relay = new FormData()
  relay.set('payload', JSON.stringify(payload))
  const resume = form.get('resume')
  if (resume instanceof File) relay.set('resume', resume)
  const receipt = env.INTAKE_RECEIPTS.get(env.INTAKE_RECEIPTS.idFromName(payload.submissionId))
  const result = await receipt.fetch(new Request('https://receipt/submit', { method: 'POST', body: relay }))
  return jsonResponse(await result.json() as object, result.status, origin)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const isAllowedOrigin = Boolean(origin && allowedOrigins(env).has(origin))

    if (request.method === 'GET' && url.pathname === '/health') {
      const configured = Boolean(env.TURNSTILE_SECRET_KEY && env.TWENTY_API_KEY && env.TWENTY_API_URL
        && env.TWENTY_APPLICANT_WEBHOOK_URL && env.TWENTY_CUSTOMER_WEBHOOK_URL
        && env.TWENTY_INVESTOR_WEBHOOK_URL && env.INTAKE_RECEIPTS)
      return jsonResponse({ ok: configured, scope: 'relay-configuration' }, configured ? 200 : 503)
    }

    if (!['/submit', '/status'].includes(url.pathname)) return jsonResponse({ message: 'Not found.' }, 404)
    if (!isAllowedOrigin) return jsonResponse({ message: 'Origin is not allowed.' }, 403)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') return jsonResponse({ message: 'Method not allowed.' }, 405, origin)

    try {
      if (url.pathname === '/status') {
        const { submissionId } = await request.json() as { submissionId?: string }
        if (!isSubmissionId(submissionId)) throw new IntakeError('Invalid submission reference.')
        const receipt = env.INTAKE_RECEIPTS.get(env.INTAKE_RECEIPTS.idFromName(submissionId))
        const response = await receipt.fetch('https://receipt/status')
        return jsonResponse(await response.json() as object, response.status, origin)
      }
      return await submitIntake(request, env, origin)
    } catch (error) {
      if (error instanceof IntakeError) return jsonResponse({ message: error.message }, error.status, origin)
      console.error('Unexpected intake error', error)
      return jsonResponse({ message: 'Something went wrong. Please try again.' }, 500, origin)
    }
  },
}

export { IntakeReceipt } from './receipt.ts'
