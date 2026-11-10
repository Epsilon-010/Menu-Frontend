/** Which confirmation a table's card has open, kept apart from React so its rules can be tested on their own. */
import type { PaymentMethod } from './api.ts'

export type BillDialogMode = { kind: 'view' } | { kind: 'pay'; method: PaymentMethod } | { kind: 'confirm-close' }

export interface BillDialog {
  /** The bill the dialog and its error belong to (null: the table has no bill). */
  billId: string | null
  mode: BillDialogMode
  error: string | null
}

export type BillDialogEvent =
  | { type: 'open'; billId: string; mode: BillDialogMode }
  | { type: 'method'; method: PaymentMethod }
  | { type: 'dismiss' }
  /** An action finished: `error` is its failure, or null when it was done. */
  | { type: 'settled'; billId: string | null; error: string | null }

export const NO_BILL_DIALOG: BillDialog = { billId: null, mode: { kind: 'view' }, error: null }

export function billDialogReducer(state: BillDialog, event: BillDialogEvent): BillDialog {
  switch (event.type) {
    case 'open':
      return { billId: event.billId, mode: event.mode, error: null }
    case 'method':
      return state.mode.kind === 'pay' ? { ...state, mode: { kind: 'pay', method: event.method } } : state
    case 'dismiss':
      return { ...state, mode: { kind: 'view' }, error: null }
    case 'settled':
      return event.error === null
        ? { billId: event.billId, mode: { kind: 'view' }, error: null }
        : { ...state, billId: event.billId, error: event.error }
  }
}

/** The dialog as it applies to the bill on screen: another bill at the table closes it and drops its error. */
export function billDialogFor(state: BillDialog, billId: string | null): BillDialog {
  return state.billId === billId ? state : { ...NO_BILL_DIALOG, billId }
}
