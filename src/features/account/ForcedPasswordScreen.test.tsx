import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Account } from '../auth/api.ts'
import { AuthContext, type AuthContextValue } from '../auth/authContext.ts'
import { RequireRole } from '../auth/RequireRole.tsx'

function admin(mustChangePassword: boolean): Account {
  return {
    user: {
      id: 'a1',
      email: 'manager@example.com',
      username: null,
      full_name: 'Manager',
      role: 'admin',
      must_change_password: mustChangePassword,
    },
    table: null,
    guest: null,
    tenant: { id: 't1', name: 'Demo' },
  }
}

const unused = () => Promise.reject(new Error('not used'))

function render(account: Account): string {
  const value: AuthContextValue = {
    state: { status: 'authenticated', account },
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
        <RequireRole roles={['admin']}>
          <p>Admin panel</p>
        </RequireRole>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireRole with a temporary password', () => {
  it('shows only the change-password screen to an admin on a temporary password', () => {
    const html = render(admin(true))

    expect(html).toContain('Choose your password')
    expect(html).toContain('Temporary password')
    expect(html).not.toContain('Admin panel')
  })

  it('shows the panel once the admin has their own password', () => {
    const html = render(admin(false))

    expect(html).toContain('Admin panel')
    expect(html).not.toContain('Choose your password')
  })
})
