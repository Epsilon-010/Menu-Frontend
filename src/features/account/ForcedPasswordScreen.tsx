import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { AuthLayout, AuthLogo } from '../../shared/ui/AuthLayout.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { ChangePasswordForm } from './ChangePasswordForm.tsx'

/** An admin on a temporary password sees only this until they pick their own password. */
export function ForcedPasswordScreen() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <AuthLogo />
          <h1 className="text-4xl font-semibold tracking-tight text-ink">Elige tu contraseña</h1>
          <p className="text-sm text-muted">
            Iniciaste sesión con una contraseña temporal. Elige la tuya para empezar a usar el panel.
          </p>
        </div>
        <ChangePasswordForm currentLabel="Contraseña temporal" submitLabel="Guardar y continuar" />
        <Button variant="ghost" disabled={signingOut} onClick={() => void handleSignOut()}>
          Cerrar sesión
        </Button>
      </div>
    </AuthLayout>
  )
}
