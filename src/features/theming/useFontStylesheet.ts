import { useEffect } from 'react'

/**
 * Adds the stylesheet of the business's fonts to the page while the menu (or the editor preview) shows it.
 * The URL comes from googleFontsUrl, built only from the curated list.
 */
export function useFontStylesheet(url: string | null): void {
  useEffect(() => {
    if (url === null) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
    return () => link.remove()
  }, [url])
}
