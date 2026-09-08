# Intake form deployment

The website remains a static Astro site on GitHub Pages. Form submissions go through the `microalchemy-intake` Cloudflare Worker so the Twenty API credential, CRM webhook URLs, and anti-spam secret never reach browser JavaScript.

Each audience has a dedicated page: `/apply`, `/build-with-us`, and `/invest-with-us`.

## Services

- Website: GitHub Pages (`microalchemy.xyz`)
- Form relay: Cloudflare Worker (`worker/src/index.ts`)
- Résumé storage: native Twenty file field (backed by Twenty's configured Google Cloud Storage bucket)
- Spam protection: Cloudflare Turnstile
- Record creation and notifications: three Twenty webhook workflows
- Customer and investor call scheduling: embedded joint Google Calendar appointment schedule for Kunal and Aditya

## One-time Cloudflare setup

Authenticate Wrangler:

```bash
npx wrangler login
```

Create a Turnstile widget for `microalchemy.xyz` (and `www.microalchemy.xyz` if used). Keep the secret key private; the site key is public.

Set the Worker secrets. Use the three webhook URLs created from the workflows in `docs/twenty-intake-setup.md`:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --config worker/wrangler.jsonc
npx wrangler secret put TWENTY_API_KEY --config worker/wrangler.jsonc
npx wrangler secret put TWENTY_APPLICANT_WEBHOOK_URL --config worker/wrangler.jsonc
npx wrangler secret put TWENTY_CUSTOMER_WEBHOOK_URL --config worker/wrangler.jsonc
npx wrangler secret put TWENTY_INVESTOR_WEBHOOK_URL --config worker/wrangler.jsonc
```

`TWENTY_API_KEY` uses the dedicated, API-key-only **Website Intake File Uploader** role. It needs `UPLOAD_FILE` and the `WORKFLOWS` permission flag for completion checks, in addition to invoking the three authenticated intake workflows. It does not need permission to create contacts: the workflows perform record operations in Twenty. The Worker sends this key as a bearer token; it is never included in the GitHub Pages bundle. Twenty's API URL and the universal identifier of the Applications `Résumé` field are non-secret Worker variables in `worker/wrangler.jsonc`.

**Permission caveat:** Twenty gates Workflow, Workflow Version, and Workflow Run access behind `WORKFLOWS`, ignoring per-object read-only overrides for those objects. The flag also grants workflow management, including editing and deletion; it is not a read-only grant. Obtain explicit owner approval before enabling it, preserve `UPLOAD_FILE`, and leave all other global record/settings/tool access disabled. This broader workflow permission was approved for the production intake role on 2026-09-08. The relay itself only reads existing run status and invokes the configured intake workflows.

If a submission is complete in CRM but the relay remains `processing`, check for HTTP 400 permission failures on the status lookup and verify the API key's role has `WORKFLOWS`. A read-only Workflow Runs override alone is insufficient. Restore access within the one-hour checking window and the next receipt alarm will reconcile the existing run without resending notifications. After the window expires, the receipt needs support review; do not submit it again.

Deploy the Worker:

```bash
npm run intake:deploy
```

The first deployment creates the `IntakeReceipt` SQLite Durable Object namespace using the checked-in migration. Do not remove or rename this binding when deploying subsequent versions. Receipts prevent duplicate webhook delivery for the same submission reference for seven days. Cloudflare supports SQLite Durable Objects on the Workers Free plan.

Deploy the Worker and activate the matching Twenty workflow versions before publishing the website. GitHub Pages publishes only the static site; it does not deploy the Worker or CRM workflows.

Before deployment, run `npm run check`, `npm run intake:test`, and `npm run intake:build`. CI runs the isolated regression tests without creating CRM records or sending mail.

Either attach `intake.microalchemy.xyz` as a Worker custom domain or keep the generated `workers.dev` URL.

## Website configuration

Set these GitHub repository variables under **Settings → Secrets and variables → Actions → Variables**:

- `PUBLIC_INTAKE_API_URL`: the Worker URL ending in `/submit`
- `PUBLIC_TURNSTILE_SITE_KEY`: the public Turnstile site key

The GitHub Pages workflow passes both values into the Astro build. Never put the Turnstile secret, Twenty API key, or Twenty webhook URLs into a `PUBLIC_` variable; those values are included in browser JavaScript.

For local development, copy `.env.example` to `.env.local`, copy `worker/.dev.vars.example` to `worker/.dev.vars`, and replace the placeholder webhook URLs. Cloudflare's documented test keys are intentionally used in the example files and must not be used in production.

Run the site and relay in separate terminals:

```bash
npm run dev
npm run intake:dev
```

## Security and data handling

- The Worker accepts only configured website origins.
- Every real submission requires server-validated Turnstile proof.
- A honeypot quietly discards simple bot submissions.
- Résumés are limited to PDF, DOC, DOCX, PNG, JPEG, and WebP files of at most 10 MB.
- Résumés are uploaded through Twenty's metadata API and attached to the native `Résumé` file field on the Application record.
- Twenty stores those files in its existing private Google Cloud Storage configuration; no Cloudflare R2 subscription or bucket is required.
- Webhook URLs and all other secrets are Worker secrets, not GitHub Pages variables.
- The Worker authenticates each relay request to Twenty with the private `TWENTY_API_KEY`; the static site never receives that credential.
- The Google booking page loads only after Twenty reports that the entire workflow completed, including both notification actions. This confirms the send actions completed; it does not prove delivery to an inbox.

## Receipt and failure handling

- `POST /submit` accepts the form and a random UUID v4 `submissionId`. Older clients without an ID receive one from the Worker. New clients retain the same reference across retries.
- A valid acknowledgement must contain `success: true` and a workflow run ID. HTTP success alone, HTML responses, and malformed acknowledgements are not treated as completion.
- `POST /status` takes `{ "submissionId": "..." }` and returns only `processing`, `completed`, `failed`, or `needs_review`, plus a public message. The UUID is an unguessable receipt capability; never publish real submission IDs in public reports.
- Durable Object alarms read `/rest/workflowRuns/{id}?depth=0`, with bounded requests and backoff, for up to one hour. Status checks continue if the visitor closes the tab. Temporary read failures remain pending; they do not cause webhook redelivery.
- Workflow failures, interrupted delivery, or unconfirmed completion retain the validated payload and uploaded file reference for support review. The form displays a reference and asks the visitor to contact Kunal instead of submitting again.
- Completed receipts immediately discard their form payload. All receipts expire after seven days. Resume binaries remain in Twenty; this relay never stores them in receipt storage. Cloudflare platform backups may retain deleted data according to its retention policy.
- Logs include submission reference, workflow run ID, and outcome without printing the full form. `/health` checks required relay bindings and configuration only; it is not a downstream CRM/mailbox health check.

## Recovering a failed submission

Find the run in Twenty's workflow history and inspect every step before retrying. A failure may occur after a record or one email already succeeded. Correct the input or mapping, confirm the intended phone country with the applicant if it is ambiguous, and recover using the original submission ID and existing résumé file reference. Never infer a country from a bare local phone number or blindly rerun both email actions. The application/opportunity/engagement primary ID is the submission ID, so repeated upserts of that same submission target the same record.

An applicant failure caused by an unqualified local phone number needs a confirmed country before recovery. Publishing new workflow versions does not replay historical runs.
