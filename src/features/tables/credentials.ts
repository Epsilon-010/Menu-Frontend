/**
 * Format of the tablet credentials the API issues. Must match the backend
 * (Backend/app/modules/tables/domain/table.py: TABLE_CODE_LENGTH and PIN_LENGTH).
 */
export const TABLE_CODE_LENGTH = 6
export const PIN_LENGTH = 8
/** PINs given before they grew to 8 digits keep working until the manager generates a new one. */
export const LEGACY_PIN_LENGTH = 6
