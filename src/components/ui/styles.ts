/** Class recipes shared by every UI component (kept apart so component files only export components). */

/** Shared motion: weighted deceleration, colors and transform only. */
export const MOTION = 'transition duration-300 ease-smooth'

/** Visible keyboard focus: a ring in the action color, offset from the surface behind it. */
export const FOCUS_RING =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-action/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

/** Floating panels (select lists, menus, tooltips) fade and scale in, only when motion is welcome. */
export const POPOVER_IN =
  'motion-safe:data-[state=open]:animate-popover-in motion-safe:data-[state=delayed-open]:animate-popover-in'
