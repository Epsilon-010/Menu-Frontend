import { createContext, useContext, type CSSProperties } from 'react'

/**
 * The CSS variables of the business's theme, as `ThemeScope` sets them on its root. Anything drawn outside that root
 * (a dialog in a portal on `body`) reads them here and sets them again, so it keeps the business's colors and fonts.
 */
export const ThemeVarsContext = createContext<CSSProperties>({})

export function useThemeVars(): CSSProperties {
  return useContext(ThemeVarsContext)
}
