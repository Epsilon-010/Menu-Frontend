/** Same limits as the server, checked before sending so the admin sees the problem at once. */
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

export interface PasswordDraft {
  current: string
  next: string
  repeat: string
}

/** What is wrong with the form, or null when it can be sent. */
export function passwordProblem(draft: PasswordDraft): string | null {
  if (draft.next.length < MIN_PASSWORD_LENGTH || draft.next.length > MAX_PASSWORD_LENGTH) {
    return `The new password must have ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`
  }
  if (draft.next !== draft.repeat) return 'The new passwords do not match.'
  if (draft.next === draft.current) return 'The new password must be different from the current one.'
  return null
}
