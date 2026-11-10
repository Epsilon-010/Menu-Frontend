import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import type { StaffRole } from './api.ts'
import { ROLE_LABELS } from './labels.ts'

interface RoleToggleProps {
  value: StaffRole
  onChange: (role: StaffRole) => void
  /** The id of a visible label; without one the control is named "Rol". */
  labelledBy?: string
}

const ROLES = Object.keys(ROLE_LABELS) as StaffRole[]

/** The staff role as a segmented control: only two short options. */
export function RoleToggle({ value, onChange, labelledBy }: RoleToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label={labelledBy ? undefined : 'Rol'}
      aria-labelledby={labelledBy}
      // Pressing the chosen role again would clear it; a staff member always has a role.
      onValueChange={(next) => next && onChange(next as StaffRole)}
    >
      {ROLES.map((role) => (
        <ToggleGroupItem key={role} value={role}>
          {ROLE_LABELS[role]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
