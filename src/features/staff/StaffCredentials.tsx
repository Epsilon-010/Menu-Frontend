import { KeyIcon } from '@phosphor-icons/react'
import { Button } from '../../shared/ui/Button.tsx'
import type { StaffMemberWithPin } from './api.ts'
import { normalizeStaffCode } from './credentials.ts'

interface StaffCredentialsProps {
  member: StaffMemberWithPin
  onDismiss: () => void
}

/** The member's code and PIN, right after a create or a new PIN: the PIN is never shown again. */
export function StaffCredentials({ member, onDismiss }: StaffCredentialsProps) {
  return (
    <div role="status" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <KeyIcon size={20} aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-amber-950">Sign in credentials for {member.full_name}</p>
          <p className="text-sm text-amber-800">
            Give this code and PIN to {member.full_name}. They sign in on the Staff tab. The PIN is shown only once.
          </p>
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4">
          <dt className="text-xs font-medium text-zinc-500">Code</dt>
          <dd className="font-mono text-2xl tracking-widest text-zinc-950">{normalizeStaffCode(member.code)}</dd>
        </div>
        <div className="rounded-xl bg-white p-4">
          <dt className="text-xs font-medium text-zinc-500">PIN</dt>
          <dd className="font-mono text-2xl tracking-widest text-zinc-950">{member.pin}</dd>
        </div>
      </dl>
      <Button variant="secondary" onClick={onDismiss}>
        I gave it to them
      </Button>
    </div>
  )
}
