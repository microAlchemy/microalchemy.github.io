# Intake form deployment

The website remains a static Vite application on GitHub Pages. Form submissions go through the `microalchemy-intake` Cloudflare Worker so the Twenty API credential, CRM webhook URLs, and anti-spam secret never reach browser JavaScript.

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

`TWENTY_API_KEY` should use a dedicated, least-privilege Twenty role that can upload the Applications `Résumé` file and invoke the three authenticated intake workflows. The Worker sends this key to Twenty as a bearer token; it is never included in the GitHub Pages bundle. Twenty's API URL and the universal identifier of the Applications `Résumé` field are non-secret Worker variables in `worker/wrangler.jsonc`.

Deploy the Worker:

```bash
npm run intake:deploy
```

Either attach `intake.microalchemy.xyz` as a Worker custom domain or keep the generated `workers.dev` URL.

## Website configuration

Set these GitHub repository variables under **Settings → Secrets and variables → Actions → Variables**:

- `VITE_INTAKE_API_URL`: the Worker URL ending in `/submit`
- `VITE_TURNSTILE_SITE_KEY`: the public Turnstile site key

The GitHub Pages workflow passes both values into the Vite build. Never put the Turnstile secret, Twenty API key, or Twenty webhook URLs into a `VITE_` variable; Vite values are public.

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
- The Google booking page loads only after a customer or investor submission succeeds, so the CRM intake is recorded before scheduling.
