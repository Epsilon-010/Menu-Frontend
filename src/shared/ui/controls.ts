/** Class recipes shared by the admin panels' own controls (kept apart so component files only export components). */

/** A checkbox for lists where several boxes can be ticked (badges, modifier groups): same size and color everywhere. */
export const CHECKBOX = 'size-4 shrink-0 cursor-pointer rounded accent-action disabled:cursor-not-allowed disabled:opacity-50'

/** A checkbox with its label: the whole label is the click target. */
export const CHECKBOX_LABEL =
  'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink-soft transition duration-300 ease-smooth hover:bg-subtle'
