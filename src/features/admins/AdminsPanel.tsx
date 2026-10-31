import { KeyIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import {
  AdminsError,
  createAdmin,
  listAdmins,
  updateAdmin,
  type AdminAccount,
  type AdminChanges,
  type AdminWithTemporaryPassword,
  type NewAdmin,
} from './api.ts'
import { AdminRow } from './AdminRow.tsx'
import { NewAdminForm, type CreateOutcome } from './NewAdminForm.tsx'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; admins: AdminAccount[] }

function messageOf(error: unknown): string {
  return error instanceof AdminsError ? error.message : 'Something went wrong. Please try again.'
}

function byName(a: AdminAccount, b: AdminAccount): number {
  return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
}

function withoutPassword(admin: AdminWithTemporaryPassword): AdminAccount {
  const { id, email, full_name, is_active, must_change_password } = admin
  return { id, email, full_name, is_active, must_change_password }
}

/** The new admin's email and temporary password, right after the create: never shown again. */
function TemporaryPassword({ admin, onDismiss }: { admin: AdminWithTemporaryPassword; onDismiss: () => void }) {
  return (
    <div role="status" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <KeyIcon size={20} aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-amber-950">Sign in details for {admin.full_name}</p>
          <p className="text-sm text-amber-800">
            Give them this email and temporary password. They must choose their own password when they first sign in.
            The temporary password is shown only once.
          </p>
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4">
          <dt className="text-xs font-medium text-zinc-500">Email</dt>
          <dd className="truncate text-lg text-zinc-950">{admin.email}</dd>
        </div>
        <div className="rounded-xl bg-white p-4">
          <dt className="text-xs font-medium text-zinc-500">Temporary password</dt>
          <dd className="font-mono text-2xl tracking-widest text-zinc-950">{admin.temporary_password}</dd>
        </div>
      </dl>
      <Button variant="secondary" onClick={onDismiss}>
        I gave it to them
      </Button>
    </div>
  )
}

/** Admin section to manage the other admins of the business. */
export function AdminsPanel() {
  const { state } = useAuth()
  const myId = state.status === 'authenticated' ? state.account.user?.id : undefined
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [loadKey, setLoadKey] = useState(0)
  // The temporary password only exists in the create response: shown once, never stored.
  const [created, setCreated] = useState<AdminWithTemporaryPassword | null>(null)

  useEffect(() => {
    let active = true
    listAdmins()
      .then((admins) => {
        if (active) setList({ status: 'loaded', admins })
      })
      .catch((error: unknown) => {
        if (active) setList({ status: 'error', message: messageOf(error) })
      })
    return () => {
      active = false
    }
  }, [loadKey])

  function retry() {
    setList({ status: 'loading' })
    setLoadKey((key) => key + 1)
  }

  function upsert(admin: AdminAccount) {
    setList((current) =>
      current.status === 'loaded'
        ? { status: 'loaded', admins: [...current.admins.filter((a) => a.id !== admin.id), admin].sort(byName) }
        : current,
    )
  }

  async function handleCreate(admin: NewAdmin): Promise<CreateOutcome> {
    try {
      const result = await createAdmin(admin)
      upsert(withoutPassword(result))
      setCreated(result)
      return { error: null }
    } catch (error) {
      const alreadyCreated = error instanceof AdminsError && error.alreadyCreated
      // The first attempt did create the admin (its answer was lost): show it and start a fresh draft.
      if (alreadyCreated) retry()
      return { error: messageOf(error), clearForm: alreadyCreated }
    }
  }

  async function handleUpdate(id: string, changes: AdminChanges): Promise<string | null> {
    try {
      upsert(await updateAdmin(id, changes))
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Admins"
        description="Admins manage everything in the business. Add one with a name and an email: you get a temporary password to hand them. Deactivating an admin signs them out of every device right away; you cannot deactivate yourself."
      />

      <NewAdminForm onCreate={handleCreate} />

      {created && <TemporaryPassword admin={created} onDismiss={() => setCreated(null)} />}

      {list.status === 'loading' && <ListSkeleton label="Loading admins" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' && (
        <Card className="p-2">
          <ul className="space-y-1">
            {list.admins.map((admin) => (
              <AdminRow
                key={admin.id}
                admin={admin}
                isYou={admin.id === myId}
                onUpdate={(changes) => handleUpdate(admin.id, changes)}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
