import { DotsThreeIcon } from '@phosphor-icons/react'
import { useId, type ReactNode } from 'react'
import { Button as UiButton } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../components/ui/dropdown-menu.tsx'
import { Label } from '../../components/ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip.tsx'
import { cn } from '../../lib/utils.ts'
import { Button } from './Button.tsx'
import { ErrorText } from './Feedback.tsx'

interface TooltipIconButtonProps {
  /** The accessible name, also shown as the tooltip. */
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}

/** A frequent row action shown as an icon, its name in a tooltip on hover or focus. */
export function TooltipIconButton({ label, icon, onClick, disabled = false }: TooltipIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <UiButton variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick} className="text-muted">
          {icon}
        </UiButton>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

interface MoreActionsMenuProps {
  /** Names the row the menu acts on, for screen readers (for example "Más acciones de Mesa 5"). */
  label?: string
  disabled?: boolean
  /** DropdownMenuItem entries. */
  children: ReactNode
}

/** The less used actions of a row, behind a "Más acciones" button. */
export function MoreActionsMenu({ label = 'Más acciones', disabled = false, children }: MoreActionsMenuProps) {
  return (
    // Not modal: an item may open a confirmation dialog, which then owns the focus.
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <UiButton variant="ghost" size="icon" aria-label={label} disabled={disabled} className="text-muted">
              <DotsThreeIcon size={20} weight="bold" aria-hidden />
            </UiButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Más acciones</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ConfirmDialogProps {
  open: boolean
  /** Closes the dialog without doing anything (cancel button, Escape or a click outside). */
  onCancel: () => void
  title: string
  children: ReactNode
  cancelLabel: string
  /** Without a confirm label the dialog only informs (for example why something cannot be deleted yet). */
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm?: () => void
  busy: boolean
  error?: string | null
}

/** Asks before an action that cannot be undone or that signs people out; stays open while it runs. */
export function ConfirmDialog({
  open,
  onCancel,
  title,
  children,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  busy,
  error = null,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
        {error && <ErrorText>{error}</ErrorText>}
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          {confirmLabel && onConfirm && (
            <Button variant={confirmVariant} disabled={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  hint?: string
  className?: string
}

/** A labeled list choice (a styled Radix select). */
export function SelectField({ label, value, options, onChange, disabled = false, hint, className }: SelectFieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const chosen = options.find((option) => option.value === value)
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger id={id} aria-describedby={hintId}>
          {/* The chosen label is given explicitly so it also shows before the list ever opens. */}
          <SelectValue>{chosen?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
