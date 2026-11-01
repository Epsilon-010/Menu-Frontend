/**
 * The app's own font (Geist), loaded without blocking the first paint: if Google Fonts is slow or filtered
 * (restaurant Wi-Fi), the app renders at once with the system font stack. A stylesheet added from a script never
 * blocks rendering, and unlike an inline `onload` handler it is allowed by the Content-Security-Policy.
 */
export const APP_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap'

const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = APP_FONTS_URL
document.head.appendChild(link)
