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
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Choose your password</h2>
          <p className="text-sm text-zinc-500">
            You signed in with a temporary password. Pick your own to start using the panel.
          </p>
        </div>
        <ChangePasswordForm currentLabel="Temporary password" submitLabel="Save and continue" />
        <Button variant="ghost" disabled={signingOut} onClick={() => void handleSignOut()}>
          Sign out
        </Button>
      </div>
    </AuthLayout>
  )
}
