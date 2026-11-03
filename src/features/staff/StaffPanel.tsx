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
  return error instanceof StaffError ? error.message : 'Algo salió mal. Intenta de nuevo.'
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
        title="Personal"
        description="Agrega a alguien solo con su nombre: recibes un código y un PIN para entregárselos. Los nombres se pueden repetir; cada persona inicia sesión con su propio código. Desactivar a alguien, cambiar su rol o generar un nuevo PIN cierra su sesión en todos sus dispositivos de inmediato."
      />

      <NewStaffMemberForm onCreate={handleCreate} />

      {credentials && <StaffCredentials member={credentials} onDismiss={() => setCredentials(null)} />}

      {list.status === 'loading' && <ListSkeleton label="Cargando personal" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.staff.length === 0 ? (
          <EmptyState icon={<UsersThreeIcon size={24} aria-hidden />} title="Aún no hay meseros ni cocineros">
            Agrega a las personas de tu turno con el formulario de arriba. Cada una recibe un código y un PIN para iniciar sesión en su propio dispositivo.
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
