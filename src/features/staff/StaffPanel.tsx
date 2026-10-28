import { UsersThreeIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import {
  createStaffMember,
  listStaff,
  regenerateStaffPin,
  StaffError,
  updateStaffMember,
  type NewStaffMember,
  type StaffMember,
  type StaffMemberChanges,
  type StaffMemberWithPin,
} from './api.ts'
import { NewStaffMemberForm, type CreateOutcome } from './NewStaffMemberForm.tsx'
import { StaffCredentials } from './StaffCredentials.tsx'
import { StaffMemberRow } from './StaffMemberRow.tsx'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; staff: StaffMember[] }

function messageOf(error: unknown): string {
  return error instanceof StaffError ? error.message : 'Something went wrong. Please try again.'
}

function byName(a: StaffMember, b: StaffMember): number {
  return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
}

function withoutPin(member: StaffMemberWithPin): StaffMember {
  return { id: member.id, code: member.code, full_name: member.full_name, role: member.role, is_active: member.is_active }
}

/** Admin section to manage the tenant's waiters and cooks. */
export function StaffPanel() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [loadKey, setLoadKey] = useState(0)
  // The PIN only exists in the create/new-PIN response: shown once, never stored.
  const [credentials, setCredentials] = useState<StaffMemberWithPin | null>(null)

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

  function upsert(member: StaffMember) {
    setList((current) =>
      current.status === 'loaded'
        ? // By id: names may repeat, and a member must never appear twice.
          { status: 'loaded', staff: [...current.staff.filter((m) => m.id !== member.id), member].sort(byName) }
        : current,
    )
  }

  async function handleCreate(member: NewStaffMember): Promise<CreateOutcome> {
    try {
      const created = await createStaffMember(member)
      upsert(withoutPin(created))
      setCredentials(created)
      return { error: null }
    } catch (error) {
      const alreadyCreated = error instanceof StaffError && error.alreadyCreated
      // The first attempt did create the member (its answer was lost): show it and start a fresh draft.
      if (alreadyCreated) retry()
      return { error: messageOf(error), clearForm: alreadyCreated }
    }
  }

  // Row actions return an error message for the row, or null on success.
  async function handleUpdate(id: string, changes: StaffMemberChanges): Promise<string | null> {
    try {
      upsert(await updateStaffMember(id, changes))
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  async function handleRegeneratePin(id: string): Promise<string | null> {
    try {
      const regenerated = await regenerateStaffPin(id)
      upsert(withoutPin(regenerated))
      setCredentials(regenerated)
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Staff"
        description="Add someone with just their name: you get a code and a PIN to give them. Names can repeat; each person signs in with their own code. Deactivating someone, changing their role or generating a new PIN signs them out of every device right away."
      />

      <NewStaffMemberForm onCreate={handleCreate} />

      {credentials && <StaffCredentials member={credentials} onDismiss={() => setCredentials(null)} />}

      {list.status === 'loading' && <ListSkeleton label="Loading staff" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.staff.length === 0 ? (
          <EmptyState icon={<UsersThreeIcon size={24} aria-hidden />} title="No waiters or cooks yet">
            Add the people on your shift with the form above. Each one gets a code and a PIN to sign in on their own device.
          </EmptyState>
        ) : (
          <Card className="p-2">
            <ul className="space-y-1">
              {list.staff.map((member) => (
                <StaffMemberRow
                  key={member.id}
                  member={member}
                  onUpdate={(changes) => handleUpdate(member.id, changes)}
                  onRegeneratePin={() => handleRegeneratePin(member.id)}
                />
              ))}
            </ul>
          </Card>
        ))}
    </div>
  )
}
