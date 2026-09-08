# Twenty website intake workflows

Three API-key-authenticated webhook workflows create CRM records and notify Kunal and Aditya. Reviewed definitions in `docs/workflows/` contain configuration and synthetic examples, not submissions or credentials.

| Audience | Workflow | Record object |
| --- | --- | --- |
| Applicant | Website — Applicant intake | `coopApplication` (Applications) |
| Customer | Website — Customer interest | `opportunity` (Opportunities) |
| Investor | Website — Investor interest | `investorEngagement` (Investor Engagements) |

## Shared contract

- Identity: `submissionId` (UUID v4), `submittedAt`, `firstName`, `lastName`, `fullName`, `email`.
- Phone: `phone` is international display text; optional `phones` is the native composite `{ primaryPhoneNumber, primaryPhoneCallingCode, primaryPhoneCountryCode }`. Map the entire object. Never map a local number with blank country metadata.
- Profile: optional `profileLink` is a native links value; map it to the contact's `linkedinLink`. It may be a portfolio rather than LinkedIn.
- Organization: `organization`, `jobTitle`, `emailDomain`, and optional `companyDomain` (native links value). Common personal email providers are excluded from domain matching; maintain this non-exhaustive exclusion list as needed.
- Consent: `consentStatus` is `PERMISSION_TO_RETAIN` after the required checkbox is checked.
- Notification: `notificationSubject` and `notificationBody` include the relevant answers. Both email actions use these, followed by source path and submission reference.
- Attribution: `sourcePath` is mapped into each intake record. UTM fields remain in the webhook payload; dedicated UTM columns are not currently mapped.

Omit absent phone/profile/domain composites instead of sending empty values that could erase existing fields.

## Applicant workflow

1. Upsert `person` by email; map name, phones, and profile. Do not overwrite the current job title with the applied-for role.
2. Upsert `coopApplication`, setting `id` and `intakeSubmissionId` from `submissionId`. Map the contact relation, `intakeRole`, `sourcePath`, `submittedAt`, `intakeSummary`, native `resume`, nullable `availabilityStart`, `consentStatus`, and `applicationSource: DIRECT`.
3. Run separate Send Email actions for `kunal@microalchemy.xyz` and `aditya@microalchemy.xyz`.

`resume` is `[{ fileId, label }]`, from the metadata upload mutation. It is not an email-attachment value with `{ id, name, size, type }`. The field identifier must match `TWENTY_RESUME_FIELD_UNIVERSAL_IDENTIFIER`.

An omitted date is `null`, never `""`. Education, degree fields, experience, EDA familiarity, lab access, on-site availability, and details are preserved in `intakeSummary` and both emails. They are not separate screening columns. The CRM's `recruitingStatus` default is `NEW`; unrelated recruitment fields and cohort defaults are preserved.

## Customer and investor workflows

1. Upsert `company` with name and optional company-domain composite.
2. Upsert `person` by email with company relation, name, submitted job title, phones, and profile.
3. Upsert the intake record with primary `id` and `intakeSubmissionId` equal to `submissionId`, contact/company relations, source path, timestamp, and audience-specific fields.
4. Notify Kunal and Aditya using the complete Worker summary.

Customer fields: `intakeOrganization`, `intakeInterestAreas`, `intakeProjectStage`, `intakeTimeline`, `intakeSummary`. Investor fields: `intakeOrganization`, `intakeInvestorType`, `intakeCheckSize`, `intakeSummary`. These are text fields, matching current metadata. Customer stage defaults to `NEW`; investor stage is left unset for review.

Company upserts use Twenty's configured unique-field matching. A domain enables matching existing domain-bearing companies. Personal email without a domain match may create another same-name company; company names are not assumed unique.

## Publication and verification

Copy the active version to a draft, edit it, validate once after all edits, and activate it. Keep `continueOnFailure` false. A successful webhook acknowledgement only means the workflow was enqueued.

The Worker role needs file-upload permission plus read-only Workflow Runs access. Receipt alarms observe the whole workflow. `COMPLETED` means both send actions finished; inbox delivery is a separate provider concern. Connect the sending mailbox with send permission under Settings → Accounts.

Before a real end-to-end test, authorize its record creation and notification emails. Exercise all audiences, local/international phones, a blank date, absent optional contact details, upload, retries, and downstream failures. Local regression tests mock external services and do not send mail.

Site deployment and workflow activation do not replay historical failures. See `intake-deployment.md` for retention and recovery.
