import { createBrowserRouter } from 'react-router'
import { RequireRole } from '../features/auth/RequireRole.tsx'
import { AdminPage } from '../pages/admin/AdminPage.tsx'
import { HomePage } from '../pages/HomePage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: (
      <RequireRole roles={['admin']}>
        <AdminPage />
      </RequireRole>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
])
