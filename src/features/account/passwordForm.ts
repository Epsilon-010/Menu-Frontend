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
    return `La nueva contraseña debe tener de ${MIN_PASSWORD_LENGTH} a ${MAX_PASSWORD_LENGTH} caracteres.`
  }
  if (draft.next !== draft.repeat) return 'Las nuevas contraseñas no coinciden.'
  if (draft.next === draft.current) return 'La nueva contraseña debe ser distinta de la actual.'
  return null
}
