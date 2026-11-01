import { isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RouteError, RouteErrorScreen } from './RouteError.tsx'
import { routes } from './routes.tsx'

describe('a page that fails while rendering', () => {
  it('is caught by one error element above every page', () => {
    expect(routes).toHaveLength(1)
    const [root] = routes
    expect(root.path).toBeUndefined()
    expect(isValidElement(root.errorElement) && root.errorElement.type).toBe(RouteError)
    const paths = (root.children ?? []).map((route) => route.path)
    expect(paths).toEqual(expect.arrayContaining(['/menu', '/admin', '/waiter', '/kitchen', '/q/:token', '*']))
  })

  it('shows a neutral screen with a reload button', () => {
    const html = renderToStaticMarkup(<RouteErrorScreen onReload={() => {}} />)
    expect(html).toContain('Something went wrong')
    expect(html).toContain('Reload')
    expect(html).toContain('role="alert"')
  })
})
