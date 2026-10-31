import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { ChangePasswordForm } from './ChangePasswordForm.tsx'

/** The signed-in admin's own account: for now, changing the password. */
export function AccountPanel() {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Account"
        description="Change the password you sign in with. Every other device where you are signed in is signed out right away."
      />
      <Card className="max-w-md p-6">
        <ChangePasswordForm />
      </Card>
    </div>
  )
}
