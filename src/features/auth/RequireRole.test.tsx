import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from './authContext.ts'
import { RequireRole } from './RequireRole.tsx'

const unused = () => Promise.reject(new Error('not used'))

function render(state: AuthContextValue['state']): string {
  const value: AuthContextValue = {
    state,
    signIn: unused,
    signInTable: unused,
    joinTable: unused,
    register: unused,
    changePassword: unused,
    signOut: () => Promise.resolve(),
  }
  return renderToStaticMarkup(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <RequireRole roles={['guest']}>
          <p>Menu</p>
        </RequireRole>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireRole', () => {
  it('offers a retry when the session could not be checked, without ending it', () => {
    const html = render({ status: 'unavailable', retry: () => undefined })

    expect(html).toContain('No se pudo comprobar tu sesión')
    expect(html).toContain('Reintentar')
    expect(html).not.toContain('Menu')
  })

  it('still shows the closing screen when the visit really ended', () => {
    const html = render({ status: 'visit-ended', reason: 'ended' })

    expect(html).not.toContain('Reintentar')
    expect(html).not.toContain('Menu')
  })
})
