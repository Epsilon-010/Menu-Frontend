import { useEffect, useState } from 'react'
import {
  createStaffMember,
  listStaff,
  resetStaffPassword,
  StaffError,
  updateStaffMember,
  type NewStaffMember,
  type StaffMember,
  type StaffMemberChanges,
} from './api.ts'
import { NewStaffMemberForm } from './NewStaffMemberForm.tsx'
import { StaffMemberRow } from './StaffMemberRow.tsx'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; staff: StaffMember[] }

function messageOf(error: unknown): string {
  return error instanceof StaffError ? error.message : 'Something went wrong. Please try again.'
}

function byName(a: StaffMember, b: StaffMember): number {
  return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
}

/** Admin section to manage the tenant's waiters and cooks. */
export function StaffPanel() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [loadKey, setLoadKey] = useState(0)

  useEffect(() => {
    let active = true
    listStaff()
      .then((staff) => {
        if (active) setList({ status: 'loaded', staff })
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

  function replaceMember(member: StaffMember) {
    setList((current) =>
      current.status === 'loaded'
        ? { status: 'loaded', staff: current.staff.map((m) => (m.id === member.id ? member : m)).sort(byName) }
        : current,
    )
  }

  // Each action returns an error message for the form that triggered it, or null on success.
  async function handleCreate(member: NewStaffMember): Promise<string | null> {
    try {
      const created = await createStaffMember(member)
      setList((current) =>
        current.status === 'loaded' ? { status: 'loaded', staff: [...current.staff, created].sort(byName) } : current,
      )
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  async function handleUpdate(id: string, changes: StaffMemberChanges): Promise<string | null> {
    try {
      replaceMember(await updateStaffMember(id, changes))
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  async function handleResetPassword(id: string, password: string): Promise<string | null> {
    try {
      await resetStaffPassword(id, password)
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Staff</h2>
        <p className="text-sm text-slate-600">
          Waiters and cooks sign in with the username and password you give them. Deactivating someone, changing their
          role or resetting their password signs them out of every device right away.
        </p>
      </div>

      <NewStaffMemberForm onCreate={handleCreate} />

      {list.status === 'loading' && <p className="text-sm text-slate-500">Loading staff…</p>}
      {list.status === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          {list.message}{' '}
          <button type="button" onClick={retry} className="underline">
            Retry
          </button>
        </p>
      )}
      {list.status === 'loaded' &&
        (list.staff.length === 0 ? (
          <p className="text-sm text-slate-500">No waiters or cooks yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {list.staff.map((member) => (
              <StaffMemberRow
                key={member.id}
                member={member}
                onUpdate={(changes) => handleUpdate(member.id, changes)}
                onResetPassword={(password) => handleResetPassword(member.id, password)}
              />
            ))}
          </ul>
        ))}
    </section>
  )
}
