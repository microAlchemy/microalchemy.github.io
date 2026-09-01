# Twenty CRM intake setup

Create three webhook-triggered workflows in Twenty. The relay chooses the workflow by audience, so applicants, prospective customers, and investors land in the correct pipeline while sharing one website experience.

Before activating email actions, connect a sending mailbox under **Settings → Accounts** and confirm it has sending permission.

## Shared payload

Each webhook receives flat JSON fields that are easy to select in Twenty's variable picker:

- identity: `submissionId`, `submittedAt`, `fullName`, `firstName`, `lastName`, `email`, `phone`, `website`
- organization: `organization`, `jobTitle`, `emailDomain`
- attribution: `source`, `sourcePath`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`
- routing: `audience`, `crmObject`, `status`
- notification: `notificationSubject`, `notificationBody`

Applicant payloads additionally contain `role`, `roleTitle`, `educationLevel`, `degreeFields`, `experienceAreas`, `edaExperience`, `labAccess`, `onsiteAvailability`, `startDate`, `resumeName`, and `resume`. The `resume` value is a Twenty-native `[{ fileId, label }]` array produced by the relay after uploading the file through Twenty's metadata API. Accepted résumé formats are PDF, DOC, DOCX, PNG, JPEG, and WebP, up to 10 MB.

Customer payloads additionally contain `interestAreas`, `projectStage`, `timeline`, and optional `details`.

Investor payloads additionally contain `investorType`, `checkSize`, and optional `details`.

## Applicant workflow

Create a custom **Applicants** object with these fields:

| Field | Type | Purpose |
| --- | --- | --- |
| Name | Text | `fullName — roleTitle` |
| Submission ID | Text, unique | Prevent duplicate webhook deliveries |
| Status | Select | New, Reviewing, Interviewing, Offer, Hired, Rejected |
| Person | Relation to People | Applicant contact record |
| Role | Text or Select | Opening applied to |
| Education | Text | Highest education level |
| Degree fields | Multi-select | Academic background |
| Experience areas | Multi-select | Role-specific screening answers |
| Open-source EDA | Select | Extensive, limited/academic, or none |
| Lab access | Long text | Current cleanroom/lab access when relevant |
| On-site availability | Select | Local/relocating or remote-only |
| Earliest start | Date | Applicant availability |
| Résumé | Files (one file) | Native Twenty file stored using the instance's configured GCS backend |
| Details | Long text | Additional context |
| Submitted at | Date/time | Intake timestamp |
| Source path | Text | Website attribution |

Workflow actions:

1. Webhook trigger named **Website — Applicant intake**. Define its expected body with an applicant test payload from the Worker.
2. **Upsert Record → People**, matching on `email`; map name, email, phone, and website.
3. **Create Record → Applicants**; relate it to the Person returned by step 2, map the applicant fields above, and set `Résumé` from the webhook's `resume` array.
4. **Send Email → kunal@microalchemy.xyz** with the notification subject/body and the Applicant record link.
5. **Send Email → aditya@microalchemy.xyz** with the same content. Twenty currently supports one recipient per Send Email action, so keep these as two actions.

## Customer workflow

Add these custom fields to **Opportunities**: Submission ID (unique text), Interest areas (multi-select), Project stage (select), Timeline (select), Intake details (long text), Source path (text), and Submitted at (date/time).

Workflow actions:

1. Webhook trigger named **Website — Customer interest**.
2. **Upsert Record → People**, matching on `email`.
3. **Upsert Record → Companies**, matching on `emailDomain` when it is a company domain; map `organization` as the company name.
4. **Create Record → Opportunities** named `organization — interestAreas`, set stage to the first/new stage, relate the Company and contact Person, and map the customer fields.
5. Send separate notification emails to `kunal@microalchemy.xyz` and `aditya@microalchemy.xyz` using the notification subject/body fields.

If an applicant uses a public email provider, do not create a Company from that domain. The website asks customers for a work email specifically, but the workflow should still branch around common public domains.

## Investor workflow

Create a custom **Investor Interests** object with these fields: Name, Submission ID (unique), Status (New, Reviewing, Meeting, Passed), Person relation, Company relation, Investor type, Typical check size, Investment focus/details, Submitted at, and Source path.

Workflow actions:

1. Webhook trigger named **Website — Investor interest**.
2. Upsert the Person by email.
3. Upsert the Company by domain when appropriate.
4. Create the Investor Interest record and relate the Person and Company from the earlier steps.
5. Send separate notification emails to `kunal@microalchemy.xyz` and `aditya@microalchemy.xyz`.

## Activation checklist

- Test each workflow with a non-production sample record.
- Confirm the created record and relations are correct.
- Confirm both notification emails arrive and the Application record contains the uploaded résumé.
- Activate all three workflows.
- Copy each webhook URL into its matching Worker secret.
- Submit one final test from each website intake path.
