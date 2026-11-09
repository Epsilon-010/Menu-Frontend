import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../features/auth/api.ts'
import { AuthContext, type AuthContextValue } from '../features/auth/authContext.ts'
import { rememberGuestQr, rememberGuestVisit } from '../features/auth/guestMarker.ts'
import { JoinTablePage } from './JoinTablePage.tsx'

const guest: Account = {
  user: null,
  table: { id: 't1', name: 'Mesa 1' },
  guest: { id: 'g1', name: 'Guest 1' },
  tenant: { id: 'b1', name: 'Demo' },
}

const unused = () => Promise.reject(new Error('not used'))

function render(token: string, state: AuthContextValue['state']): string {
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
      <MemoryRouter initialEntries={[`/q/${token}`]}>
        <Routes>
          <Route path="/q/:token" element={<JoinTablePage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const FORM_TITLE = 'Únete a tu mesa'

beforeEach(() => {
  const entries = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JoinTablePage', () => {
  it('offers the join form to a guest with a live visit who scans another table', () => {
    rememberGuestQr('qr-a')

    expect(render('qr-b', { status: 'authenticated', account: guest })).toContain(FORM_TITLE)
  })

  it('sends a guest who scans the same QR back to the menu', () => {
    rememberGuestQr('qr-a')

    expect(render('qr-a', { status: 'authenticated', account: guest })).not.toContain(FORM_TITLE)
  })

  it('offers the form when the device does not know which QR the guest used, rather than ordering at the wrong table', () => {
    expect(render('qr-b', { status: 'authenticated', account: guest })).toContain(FORM_TITLE)
  })

  it('still offers the form to someone without a session', () => {
    expect(render('qr-b', { status: 'anonymous' })).toContain(FORM_TITLE)
  })

  it('forgets the QR once the device stops being a guest', () => {
    rememberGuestQr('qr-a')
    rememberGuestVisit(false)

    expect(render('qr-a', { status: 'authenticated', account: guest })).toContain(FORM_TITLE)
  })
})
