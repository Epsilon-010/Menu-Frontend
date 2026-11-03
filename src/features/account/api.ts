import { apiFetch, type SessionInfo } from '../../shared/api/http.ts'

/** Error with a message ready to show to the admin. */
export class PasswordChangeError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

/**
 * Replaces the signed-in admin's password. The server signs every other device out and sets fresh
 * session cookies for this one.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<SessionInfo> {
  let response: Response
  try {
    response = await apiFetch('/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
  } catch {
    throw new PasswordChangeError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (response.ok) return (await response.json()) as SessionInfo
  if (response.status === 429) {
    throw new PasswordChangeError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.', 429)
  }
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string' && (response.status === 400 || response.status === 422)) {
    throw new PasswordChangeError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 401) {
    throw new PasswordChangeError('Tu sesión terminó. Inicia sesión de nuevo para cambiar tu contraseña.', 401)
  }
  throw new PasswordChangeError('El servidor no pudo completar la acción. Inténtalo de nuevo en un momento.', response.status)
}
