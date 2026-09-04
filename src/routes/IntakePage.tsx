import { FormEvent, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jobs } from '../jobs/jobs'
import './intake.css'

type Audience = 'applicant' | 'customer' | 'investor'
type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

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
    description: '',
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
  widgetIdRef: MutableRefObject<string | undefined>
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

const CommonFields = ({ audience }: { audience: Audience }) => (
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
        <input name="phone" type="tel" autoComplete="tel" required={audience === 'applicant'} maxLength={40} />
      </label>
      <label className="intake-field">
        <span>{audience === 'applicant' ? 'LinkedIn or portfolio' : 'Website or LinkedIn'} <em>optional</em></span>
        <input name="website" type="url" inputMode="url" placeholder="https://" maxLength={300} />
      </label>
    </div>
  </>
)

const ApplicantFields = ({ role, setRole }: { role: string; setRole: (value: string) => void }) => {
  const roleExperience = experienceOptions[role] ?? []

  return (
    <>
      <div className="intake-form-grid">
        <label className="intake-field intake-field-wide">
          <span>Role <b>*</b></span>
          <select name="role" value={role} onChange={(event) => setRole(event.target.value)} required>
            {jobs.map((job) => (
              <option key={job.slug} value={job.slug}>{job.frontmatter.title}</option>
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

const IntakePage = ({ audience }: { audience: Audience }) => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedRole = searchParams.get('role')
  const initialRole = jobs.some((job) => job.slug === requestedRole) ? requestedRole! : jobs[0]?.slug ?? ''
  const [role, setRole] = useState(initialRole)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const startedAtRef = useRef(Date.now())
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined)
  const applicantFollowUpRef = useRef<HTMLElement>(null)
  const bookingRef = useRef<HTMLElement>(null)

  const endpoint = import.meta.env.VITE_INTAKE_API_URL || 'https://microalchemy-intake.kunal-chandan.workers.dev/submit'
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? '1x00000000000000000000AA' : '')
  const copy = audienceCopy[audience]

  useEffect(() => {
    if (audience === 'applicant') setRole(initialRole)
    setSubmissionState('idle')
    setStatusMessage('')
    setTurnstileToken('')
    startedAtRef.current = Date.now()
  }, [audience, initialRole])

  useEffect(() => {
    if (submissionState === 'success') {
      if (audience === 'applicant') applicantFollowUpRef.current?.focus()
      else bookingRef.current?.focus()
    }
  }, [audience, submissionState])

  const validateSubmission = (data: FormData) => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    data.set('turnstileToken', turnstileToken)
    data.set('formStartedAt', String(startedAtRef.current))
    data.set('sourcePath', `${window.location.pathname}${window.location.search}`)
    data.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = searchParams.get(key)
      if (value) data.set(key, value)
    }

    setSubmissionState('submitting')
    setStatusMessage('Sending your information…')

    try {
      const response = await fetch(endpoint, { method: 'POST', body: data })
      const result = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(result.message || 'We could not send your submission.')

      form.reset()
      setSubmissionState('success')
      setStatusMessage('Received. Kunal and Aditya have been notified, and your submission is now in our CRM.')
      setTurnstileToken('')
      window.turnstile?.reset(turnstileWidgetIdRef.current)
      startedAtRef.current = Date.now()
    } catch (error) {
      setTurnstileToken('')
      window.turnstile?.reset(turnstileWidgetIdRef.current)
      setSubmissionState('error')
      setStatusMessage(error instanceof Error ? error.message : 'We could not send your submission. Please try again.')
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
            <Link to="/">Home</Link>
            <Link to="/careers">Careers</Link>
          </nav>
        </header>

        <section className="intake-panel">
          <div className="intake-panel-heading">
            <span>{audience.toUpperCase()} INTAKE</span>
            <p>Fields marked * are required.</p>
          </div>

          <form key={`${audience}-${initialRole}`} onSubmit={handleSubmit} className="intake-form">
            <input className="intake-honeypot" type="text" name="companyFax" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <CommonFields audience={audience} />
            {audience === 'applicant' ? <ApplicantFields role={role} setRole={setRole} /> : null}
            {audience === 'customer' ? <CustomerFields presetInterest={searchParams.get('interest') ?? ''} /> : null}
            {audience === 'investor' ? <InvestorFields /> : null}

            <label className="intake-check intake-consent">
              <input type="checkbox" name="consent" value="yes" required />
              <span>I agree that MicroAlchemy may use this information to evaluate and respond to my submission. <b>*</b></span>
            </label>

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
              <button type="submit" disabled={submissionState === 'submitting' || !turnstileSiteKey}>
                {submissionState === 'submitting' ? 'Submitting…' : audience === 'applicant' ? 'Submit application' : 'Send inquiry'}
              </button>
              <p className={`intake-status intake-status-${submissionState}`} role="status" aria-live="polite">{statusMessage}</p>
            </div>

            {audience === 'applicant' && submissionState === 'success' ? (
              <aside ref={applicantFollowUpRef} className="intake-follow-up" tabIndex={-1} aria-labelledby="applicant-follow-up-title">
                <div>
                  <span>Optional, separate inquiry</span>
                  <h2 id="applicant-follow-up-title">Have a project in mind too?</h2>
                  <p>Your application is complete. If you are also designing or fabricating something, tell us how we can build it with you.</p>
                </div>
                <button type="button" onClick={() => navigate('/build-with-us')}>Build with us →</button>
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
