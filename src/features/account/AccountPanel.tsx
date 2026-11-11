import { UserCircleIcon } from '@phosphor-icons/react'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { ChangePasswordForm } from './ChangePasswordForm.tsx'

/** The signed-in admin's own account: for now, changing the password. */
export function AccountPanel() {
  return (
    <div className="space-y-8">
      <SectionHeader
        icon={<UserCircleIcon size={24} weight="fill" aria-hidden />}
        title="Cuenta"
        description="Cambia la contraseña con la que inicias sesión. La sesión se cierra de inmediato en todos tus otros dispositivos."
      />
      <Card className="max-w-md p-6">
        <ChangePasswordForm />
      </Card>
    </div>
  )
}
