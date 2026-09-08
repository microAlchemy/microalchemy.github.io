import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCountries } from 'libphonenumber-js/max'

for (const route of ['apply', 'build-with-us', 'invest-with-us']) {
  const html = readFileSync(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8')
  const countries = html.match(/<select name="phoneCountry"[^>]*>([\s\S]*?)<\/select>/)?.[1]
  assert.ok(countries, `${route}: missing phone country selector`)
  const options = Array.from(countries.matchAll(/<option value="([A-Z]{2})">([^<]+)<\/option>/g),
    ([, code, label]) => ({ code, label }))
  assert.deepEqual(options, getCountries().map((code) => ({ code, label: code })),
    `${route}: initial country options must not depend on server ICU localization`)
  assert.match(html, /<fieldset class="intake-fields" disabled=""/,
    `${route}: fields must remain disabled until hydration finishes`)
  assert.ok(html.includes('Loading form…'), `${route}: missing initial loading state`)
}

console.log('Intake output validation passed (3 forms, deterministic initial country options)')
