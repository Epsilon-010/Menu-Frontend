/**
 * Staff sign in credentials. Must match the backend: a generated code of STAFF_CODE_LENGTH
 * characters (stored lowercase, shown uppercase) and a PIN of STAFF_PIN_LENGTH digits.
 * Accounts made before codes keep their old username as code and their password until a new PIN.
 */
export const STAFF_CODE_LENGTH = 6
export const STAFF_PIN_LENGTH = 6

/** The code as staff should see and type it: uppercase, without spaces. */
export function normalizeStaffCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase()
}
