import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject, SubmitEvent as ReactSubmitEvent } from 'react'
import { getCountries } from 'libphonenumber-js/max'
import { isSubmissionId, normalizePhone } from '../lib/intake'
import './intake.css'

type Audience = 'applicant' | 'customer' | 'investor'
type SubmissionState = 'idle' | 'submitting' | 'processing' | 'success' | 'error' | 'needs_review' | 'failed'
type ReceiptResponse = { ok?: boolean; submissionId?: string; status?: string; message?: string }
type JobOption = { slug: string; title: string }

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
  reset: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const audienceCopy: Record<Audience, { eyebrow: string; title: string; description: string }> = {
  applicant: {
    eyebrow: 'Join the team',
    title: 'Apply to MicroAlchemy',
    description: 'Tell us where you do your best work. Your application goes directly to our hiring pipeline.',
  },
  customer: {
    eyebrow: 'Customer & partner intake',
    title: 'Build with us',
    description: 'Tell us what you are designing, where you are in the process, and what fabrication or tooling support you need.',
  },
  investor: {
    eyebrow: 'Invest with us',
    title: 'Start a conversation',
    description: 'Tell us about your firm and investment focus. The founding team reviews every investor introduction.',
  },
}

const degreeOptions = [
  'Computer Science',
  'Software Engineering',
  'Computer Engineering',
  'Electrical Engineering',
  'Nanotechnology Engineering',
  'Chemical Engineering',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Materials Science',
  'Chemistry',
  'Physics',
  'Other',
]

const experienceOptions: Record<string, string[]> = {
  'founding-software-engineer-eda': [
    'Electronic Design Automation',
    'GUI tools',
    'Compilers or programming language design',
    'Hardware Description Languages',
    'Simulation and numerical methods',
  ],
  'founding-semi-eng': [
    'Fabrication techniques',
    'Materials or device characterization',
    'Equipment maintenance and troubleshooting',
    'Cleanroom equipment sourcing and design',
    'Electrical characterization equipment',
  ],
  'founding-hardware-engineer': [
    '3D printing',
    'CNC machining',
    'Welding',
    '3D CAD',
    'PCB design or robotics',
    'Hazardous chemicals or gases',
  ],
}

const customerInterests = [
  'Alembic design language',
  'Workshop open-source designs',
  'Foundry fabrication',
  'Technical partnership',
  'Something else',
]

const bookingPageUrl = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2ryWAIJThWfQQJpyFuatXX_vQSTNuyyJBMhS0a6blqHYDUPeUEdOKtsjqMpGNdbwI52GcIEfwl?gv=true'

const CheckboxGroup = ({ name, options }: { name: string; options: string[] }) => (
  <div className="intake-checkbox-grid">
    {options.map((option) => (
      <label key={option} className="intake-check">
        <input type="checkbox" name={name} value={option} />
        <span>{option}</span>
      </label>
    ))}
  </div>
)

const TurnstileWidget = ({
  siteKey,
  onToken,
  widgetIdRef,
}: {
  siteKey: string
  onToken: (token: string) => void
  widgetIdRef: RefObject<string | undefined>
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!siteKey) return undefined

    let disposed = false
    const renderWidget = () => {
      if (disposed || !containerRef.current || !window.turnstile || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        size: 'flexible',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const scriptId = 'microalchemy-turnstile'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', renderWidget)
    }

    return () => {
      disposed = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = undefined
    }
  }, [onToken, siteKey, widgetIdRef])

  return <div ref={containerRef} className="intake-turnstile" aria-label="Security verification" />
}

const CommonFields = ({ audience }: { audience: Audience }) => {
  // Node and browsers can ship different ICU country names and sort orders.
  // Keep the server and first client render identical, then localize after mount.
  const [phoneCountries, setPhoneCountries] = useState(() =>
    getCountries().map((code) => ({ code, name: String(code) })))
  useEffect(() => {
    const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
    setPhoneCountries(getCountries().map((code) => ({ code, name: countryNames.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en')))
  }, [])

  return (
  <>
    <div className="intake-form-grid">
      <label className="intake-field">
        <span>Full name <b>*</b></span>
        <input name="fullName" autoComplete="name" required maxLength={120} />
      </label>
      <label className="intake-field">
        <span>{audience === 'customer' ? 'Work email' : 'Email'} <b>*</b></span>
        <input name="email" type="email" autoComplete="email" required maxLength={180} />
      </label>
      <label className="intake-field">
        <span>Phone {audience === 'applicant' ? <b>*</b> : <em>optional</em>}</span>
        <input name="phone" type="tel" autoComplete="tel" placeholder="+1 416 555 0123" required={audience === 'applicant'} maxLength={40} />
        <span className="intake-field-help">Include the country code, or select the phone’s country below.</span>
      </label>
      <label className="intake-field">
        <span>Phone country <em>optional for international numbers</em></span>
        <select name="phoneCountry" defaultValue="">
          <option value="">My number includes +country code</option>
          {phoneCountries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <label className="intake-field">
        <span>{audience === 'applicant' ? 'LinkedIn or portfolio' : 'Website or LinkedIn'} <em>optional</em></span>
        <input name="website" type="url" inputMode="url" placeholder="https://" maxLength={300} />
      </label>
    </div>
  </>
  )
}

const ApplicantFields = ({ role, setRole, jobOptions }: { role: string; setRole: (value: string) => void; jobOptions: JobOption[] }) => {
  const roleExperience = experienceOptions[role] ?? []

  return (
    <>
      <div className="intake-form-grid">
        <label className="intake-field intake-field-wide">
          <span>Role <b>*</b></span>
          <select name="role" value={role} onChange={(event) => setRole(event.target.value)} required>
            {jobOptions.map((job) => (
              <option key={job.slug} value={job.slug}>{job.title}</option>
            ))}
          </select>
        </label>
        <label className="intake-field">
          <span>Highest education <b>*</b></span>
          <select name="educationLevel" required defaultValue="">
            <option value="" disabled>Select one</option>
            <option>Bachelor&apos;s degree</option>
            <option>Master&apos;s degree</option>
            <option>Doctorate (Ph.D.)</option>
            <option>Equivalent professional experience</option>
          </select>
        </label>
        <label className="intake-field">
          <span>Earliest start date <em>optional</em></span>
          <input name="startDate" type="date" />
        </label>
      </div>

      <fieldset className="intake-fieldset">
        <legend>Primary degree field(s) <b>*</b></legend>
        <CheckboxGroup name="degreeFields" options={degreeOptions} />
      </fieldset>

      <fieldset className="intake-fieldset">
        <legend>Relevant experience <b>*</b></legend>
        <CheckboxGroup name="experienceAreas" options={roleExperience} />
      </fieldset>

      {role !== 'founding-hardware-engineer' ? (
        <label className="intake-field">
          <span>Open-source EDA experience <b>*</b></span>
          <select name="edaExperience" required defaultValue="">
            <option value="" disabled>Select one</option>
            <option>Extensive professional experience</option>
            <option>Limited or academic experience</option>
            <option>No experience yet</option>
          </select>
        </label>
      ) : null}

      {role === 'founding-semi-eng' ? (
        <label className="intake-field">
          <span>Labs or cleanrooms you can currently access <em>optional</em></span>
          <textarea name="labAccess" rows={3} maxLength={1000} placeholder="QNFCF/QNC, RAC1, CIRFE, G2N, or another facility." />
        </label>
      ) : null}

      <fieldset className="intake-fieldset intake-radio-fieldset">
        <legend>Can you work on-site in the Waterloo/Toronto area? <b>*</b></legend>
        <label className="intake-check">
          <input type="radio" name="onsiteAvailability" value="Yes — local or willing to relocate" required />
          <span>Yes — I am local or willing to relocate</span>
        </label>
        <label className="intake-check">
          <input type="radio" name="onsiteAvailability" value="No — remote only" required />
          <span>No — I require remote work</span>
        </label>
      </fieldset>

      <label className="intake-field">
        <span>Résumé <b>*</b></span>
        <span className="intake-field-help">PDF, DOC, DOCX, PNG, JPEG, or WebP up to 10 MB.</span>
        <input
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
          required
        />
      </label>

      <label className="intake-field">
        <span>Anything else we should know? <em>optional</em></span>
        <textarea name="details" rows={5} maxLength={4000} placeholder="Projects, open-source work, lab access, or context that helps us understand your experience." />
      </label>
    </>
  )
}

const CustomerFields = ({ presetInterest }: { presetInterest: string }) => (
  <>
    <div className="intake-form-grid">
      <label className="intake-field">
        <span>Company or organization <b>*</b></span>
        <input name="organization" autoComplete="organization" required maxLength={180} />
      </label>
      <label className="intake-field">
        <span>Your role <em>optional</em></span>
        <input name="jobTitle" autoComplete="organization-title" maxLength={120} />
      </label>
      <label className="intake-field">
        <span>Project stage <b>*</b></span>
        <select name="projectStage" required defaultValue="">
          <option value="" disabled>Select one</option>
          <option>Exploring an idea</option>
          <option>Actively designing</option>
          <option>Ready to fabricate</option>
          <option>Already in production</option>
        </select>
      </label>
      <label className="intake-field">
        <span>Ideal timeline <b>*</b></span>
        <select name="timeline" required defaultValue="">
          <option value="" disabled>Select one</option>
          <option>As soon as possible</option>
          <option>Within 3 months</option>
          <option>3–6 months</option>
          <option>More than 6 months</option>
          <option>Just exploring</option>
        </select>
      </label>
    </div>

    <fieldset className="intake-fieldset">
      <legend>What are you interested in? <b>*</b></legend>
      <div className="intake-checkbox-grid">
        {customerInterests.map((option) => (
          <label key={option} className="intake-check">
            <input type="checkbox" name="interestAreas" value={option} defaultChecked={presetInterest === 'partnership' && option === 'Technical partnership'} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>

    <label className="intake-field">
      <span>What are you trying to build? <em>optional</em></span>
      <textarea name="details" rows={7} maxLength={5000} placeholder="Describe the design, process, constraints, quantities, or outcome you need." />
    </label>
  </>
)

const InvestorFields = () => (
  <>
    <div className="intake-form-grid">
      <label className="intake-field">
        <span>Firm or organization <b>*</b></span>
        <input name="organization" autoComplete="organization" required maxLength={180} />
      </label>
      <label className="intake-field">
        <span>Your role <b>*</b></span>
        <input name="jobTitle" autoComplete="organization-title" required maxLength={120} />
      </label>
      <label className="intake-field">
        <span>Investor type <b>*</b></span>
        <select name="investorType" required defaultValue="">
          <option value="" disabled>Select one</option>
          <option>Venture fund</option>
          <option>Corporate venture</option>
          <option>Family office</option>
          <option>Angel investor</option>
          <option>Strategic investor</option>
          <option>Other</option>
        </select>
      </label>
      <label className="intake-field">
        <span>Typical check size <em>optional</em></span>
        <select name="checkSize" defaultValue="">
          <option value="">Prefer not to say</option>
          <option>Under $250k</option>
          <option>$250k–$1M</option>
          <option>$1M–$5M</option>
          <option>$5M+</option>
        </select>
      </label>
    </div>

    <label className="intake-field">
      <span>Investment focus and reason for reaching out <small>(optional)</small></span>
      <textarea name="details" rows={7} maxLength={5000} placeholder="Tell us about your thesis, relevant portfolio, and what caught your attention." />
    </label>
  </>
)

const IntakePage = ({ audience, jobOptions }: { audience: Audience; jobOptions: JobOption[] }) => {
  const [ready, setReady] = useState(false)
  const [role, setRole] = useState(jobOptions[0]?.slug ?? '')
  const [presetInterest, setPresetInterest] = useState('')
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const startedAtRef = useRef(Date.now())
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined)
  const applicantFollowUpRef = useRef<HTMLElement>(null)
  const bookingRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const submissionIdRef = useRef('')
  const [receiptId, setReceiptId] = useState('')
  const [statusCheck, setStatusCheck] = useState(0)

  const endpoint = import.meta.env.PUBLIC_INTAKE_API_URL || 'https://microalchemy-intake.kunal-chandan.workers.dev/submit'
  const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? '1x00000000000000000000AA' : '')
  const copy = audienceCopy[audience]
  const storageKey = `microalchemy-intake-${audience}`
  const statusEndpoint = new URL('/status', endpoint).href
  const applyReceipt = useCallback((result: ReceiptResponse) => {
    if (!result.ok || !isSubmissionId(result.submissionId)
      || !['processing', 'completed', 'failed', 'needs_review'].includes(result.status ?? '')) {
      throw new Error('We could not confirm receipt. Your information has not been cleared; please try again.')
    }
    submissionIdRef.current = result.submissionId
    setReceiptId(result.submissionId)
    setStatusMessage(result.message ?? 'Received. Checking submission status…')
    setSubmissionState(result.status === 'completed' ? 'success' : result.status as SubmissionState)
    try {
      if (result.status === 'completed') sessionStorage.removeItem(storageKey)
      else sessionStorage.setItem(storageKey, result.submissionId)
    } catch { /* Storage may be disabled by the browser. */ }
    if (result.status === 'completed') formRef.current?.reset()
  }, [storageKey])

  useEffect(() => {
    setReady(true)
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (isSubmissionId(saved)) {
        submissionIdRef.current = saved
        setReceiptId(saved)
        setSubmissionState('processing')
      }
    } catch { /* Storage may be disabled by the browser. */ }
  }, [storageKey])

  useEffect(() => {
    if (!receiptId || submissionState !== 'processing') return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const poll = async () => {
      try {
        const response = await fetch(statusEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: receiptId }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        })
        if (controller.signal.aborted) return
        if (response.status === 404) {
          setReceiptId('')
          setSubmissionState('error')
          setStatusMessage('No receipt was found. Please submit the form again.')
          return
        }
        if (!response.ok) throw new Error('Status check unavailable')
        const result = await response.json() as ReceiptResponse
        if (controller.signal.aborted) return
        applyReceipt(result)
        if (result.status !== 'processing') return
      } catch {
        if (controller.signal.aborted) return
        setStatusMessage('We could not check your submission yet. Use Check status below; please do not submit it again.')
      }
      if (++attempts < 20) timer = setTimeout(poll, 3000)
    }
    timer = setTimeout(poll, 1500)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [receiptId, submissionState, statusCheck, statusEndpoint, applyReceipt])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedRole = params.get('role')
    if (audience === 'applicant') {
      const requestedRoleExists = jobOptions.some((job) => job.slug === requestedRole)
      setRole(requestedRoleExists ? requestedRole! : jobOptions[0]?.slug ?? '')
    }
    setPresetInterest(params.get('interest') ?? '')
    setTurnstileToken('')
    startedAtRef.current = Date.now()
  }, [audience, jobOptions])

  useEffect(() => {
    if (submissionState === 'success') {
      if (audience === 'applicant') applicantFollowUpRef.current?.focus()
      else bookingRef.current?.focus()
    }
  }, [audience, submissionState])

  const validateSubmission = (data: FormData) => {
    try { normalizePhone(String(data.get('phone') ?? ''), String(data.get('phoneCountry') ?? '')) }
    catch (error) { return (error as Error).message }
    const resume = data.get('resume')
    if (audience === 'applicant') {
      if (!data.getAll('degreeFields').length) return 'Select at least one degree field.'
      if (!data.getAll('experienceAreas').length) return 'Select at least one relevant experience area.'
      if (!(resume instanceof File) || !resume.size) return 'Attach your résumé before submitting.'
      if (resume.size > 10 * 1024 * 1024) return 'Your résumé must be 10 MB or smaller.'
    }
    if (audience === 'customer' && !data.getAll('interestAreas').length) return 'Select at least one area of interest.'
    if (turnstileSiteKey && !turnstileToken) return 'Complete the security verification before submitting.'
    return ''
  }

  const handleSubmit = async (event: ReactSubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const validationMessage = validateSubmission(data)
    if (validationMessage) {
      setSubmissionState('error')
      setStatusMessage(validationMessage)
      return
    }

    data.set('audience', audience)
    submissionIdRef.current ||= crypto.randomUUID()
    data.set('submissionId', submissionIdRef.current)
    try { sessionStorage.setItem(storageKey, submissionIdRef.current) } catch { /* Optional browser storage. */ }
    data.set('turnstileToken', turnstileToken)
    data.set('formStartedAt', String(startedAtRef.current))
    data.set('sourcePath', `${window.location.pathname}${window.location.search}`)
    data.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    const currentParams = new URLSearchParams(window.location.search)
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = currentParams.get(key)
      if (value) data.set(key, value)
    }

    setSubmissionState('submitting')
    setStatusMessage('Sending your information…')

    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, signal: AbortSignal.timeout(45000) })
      const result = await response.json().catch(() => ({})) as ReceiptResponse
      if (!response.ok) {
        if (response.status < 500 && response.status !== 409) {
          try { sessionStorage.removeItem(storageKey) } catch { /* Optional browser storage. */ }
          submissionIdRef.current = ''
        }
        throw new Error(result.message || 'We could not send your submission.')
      }

      applyReceipt(result)
      setTurnstileToken('')
      window.turnstile?.reset(turnstileWidgetIdRef.current)
      startedAtRef.current = Date.now()
    } catch (error) {
      setTurnstileToken('')
      window.turnstile?.reset(turnstileWidgetIdRef.current)
      if (submissionIdRef.current) {
        setReceiptId(submissionIdRef.current)
        setSubmissionState('processing')
        setStatusMessage('The connection was interrupted. Checking whether your submission was received…')
      } else {
        setSubmissionState('error')
        setStatusMessage(error instanceof Error ? error.message : 'We could not send your submission. Please try again.')
      }
    }
  }

  return (
    <main className="intake-shell">
      <div className="intake-container">
        <header className="intake-header">
          <div>
            <div className="intake-eyebrow">{copy.eyebrow}</div>
            <h1>{copy.title}</h1>
            {copy.description ? <p>{copy.description}</p> : null}
          </div>
          <nav className="intake-nav" aria-label="Page navigation">
            <a href="/">Home</a>
            <a href="/careers/">Careers</a>
          </nav>
        </header>

        <section className="intake-panel">
          <div className="intake-panel-heading">
            <span>{audience.toUpperCase()} INTAKE</span>
            <p>Fields marked * are required.</p>
          </div>

          <form ref={formRef} key={audience} onSubmit={handleSubmit} className="intake-form">
            <fieldset className="intake-fields" disabled={!ready || submissionState === 'submitting' || Boolean(receiptId)}>
            <input className="intake-honeypot" type="text" name="companyFax" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <CommonFields audience={audience} />
            {audience === 'applicant' ? <ApplicantFields role={role} setRole={setRole} jobOptions={jobOptions} /> : null}
            {audience === 'customer' ? <CustomerFields presetInterest={presetInterest} /> : null}
            {audience === 'investor' ? <InvestorFields /> : null}

            <label className="intake-check intake-consent">
              <input type="checkbox" name="consent" value="yes" required />
              <span>I agree that MicroAlchemy may use this information to evaluate and respond to my submission. <b>*</b></span>
            </label>

            </fieldset>

            {turnstileSiteKey ? (
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onToken={setTurnstileToken}
                widgetIdRef={turnstileWidgetIdRef}
              />
            ) : (
              <p className="intake-config-warning">Security verification is not configured yet. Submissions remain disabled until the production key is added.</p>
            )}

            <div className="intake-submit-row">
              <button type="submit" disabled={!ready || submissionState === 'submitting' || !turnstileSiteKey || Boolean(receiptId)}>
                {!ready ? 'Loading form…' : submissionState === 'submitting' ? 'Submitting…' : audience === 'applicant' ? 'Submit application' : 'Send inquiry'}
              </button>
              <p className={`intake-status intake-status-${submissionState}`} role="status" aria-live="polite">{statusMessage}</p>
            </div>
            {receiptId ? <p className="intake-status">Reference: {receiptId}</p> : null}
            {receiptId && submissionState === 'processing' ? (
              <button type="button" className="blog-cta-link" onClick={() => setStatusCheck((value) => value + 1)}>Check status</button>
            ) : null}

            {audience === 'applicant' && submissionState === 'success' ? (
              <aside ref={applicantFollowUpRef} className="intake-follow-up" tabIndex={-1} aria-labelledby="applicant-follow-up-title">
                <div>
                  <span>Optional, separate inquiry</span>
                  <h2 id="applicant-follow-up-title">Have a project in mind too?</h2>
                  <p>Your application is complete. If you are also designing or fabricating something, tell us how we can build it with you.</p>
                </div>
                <button type="button" onClick={() => window.location.assign('/build-with-us/')}>Build with us →</button>
              </aside>
            ) : null}

            {audience !== 'applicant' && submissionState === 'success' ? (
              <aside ref={bookingRef} className="intake-booking" tabIndex={-1} aria-labelledby="intake-booking-title">
                <div className="intake-booking-heading">
                  <div>
                    <span>Optional next step</span>
                    <h2 id="intake-booking-title">Schedule a call with Kunal &amp; Aditya</h2>
                    <p>Choose a 30-minute time that works for you. Google Meet details will be added automatically.</p>
                  </div>
                  <a href={bookingPageUrl} target="_blank" rel="noreferrer">Open calendar ↗</a>
                </div>
                <iframe
                  className="intake-booking-frame"
                  src={bookingPageUrl}
                  title="Schedule a 30-minute call with Kunal and Aditya"
                  loading="lazy"
                />
              </aside>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  )
}

export default IntakePage
