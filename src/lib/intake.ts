import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'

export const normalizePhone = (value: string, country = '') => {
  if (!value.trim()) return undefined
  if (!value.trim().startsWith('+') && !country) {
    throw new Error('Include your phone’s country code (for example +1), or select its country.')
  }
  const phone = parsePhoneNumberFromString(value, country as CountryCode || undefined)
  if (!phone?.isValid()) throw new Error('Enter a valid phone number, including its country code.')
  return {
    primaryPhoneNumber: phone.nationalNumber,
    primaryPhoneCallingCode: `+${phone.countryCallingCode}`,
    primaryPhoneCountryCode: phone.country ?? '',
  }
}

export const optionalDate = (value: string) => {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Enter a valid start date.')
  }
  return value
}

export const isSubmissionId = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
