import { UsersThreeIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
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
    <div className="space-y-8">
      <SectionHeader
        title="Staff"
        description="Waiters and cooks sign in with the username and password you give them. Deactivating someone, changing their role or setting a new password signs them out of every device right away."
      />

      <NewStaffMemberForm onCreate={handleCreate} />

      {list.status === 'loading' && <ListSkeleton label="Loading staff" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.staff.length === 0 ? (
          <EmptyState icon={<UsersThreeIcon size={24} aria-hidden />} title="No waiters or cooks yet">
            Add the people on your shift with the form above. Each one gets a username to sign in on their own device.
          </EmptyState>
        ) : (
          <Card className="p-2">
            <ul className="space-y-1">
              {list.staff.map((member) => (
                <StaffMemberRow
                  key={member.id}
                  member={member}
                  onUpdate={(changes) => handleUpdate(member.id, changes)}
                  onResetPassword={(password) => handleResetPassword(member.id, password)}
                />
              ))}
            </ul>
          </Card>
        ))}
    </div>
  )
}
