import { createBrowserRouter } from 'react-router'
import { RequireRole } from '../features/auth/RequireRole.tsx'
import { CatalogPanel } from '../features/catalog/CatalogPanel.tsx'
import { StaffPanel } from '../features/staff/StaffPanel.tsx'
import { TablesPanel } from '../features/tables/TablesPanel.tsx'
import { AdminPage } from '../pages/admin/AdminPage.tsx'
import { HomePage } from '../pages/HomePage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { MenuPage } from '../pages/menu/MenuPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { KitchenPage } from '../pages/staff/KitchenPage.tsx'
import { WaiterPage } from '../pages/staff/WaiterPage.tsx'

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
    children: [
      { index: true, element: <CatalogPanel /> },
      { path: 'tables', element: <TablesPanel /> },
      { path: 'staff', element: <StaffPanel /> },
    ],
  },
  {
    path: '/waiter',
    element: (
      <RequireRole roles={['waiter']}>
        <WaiterPage />
      </RequireRole>
    ),
  },
  {
    path: '/menu',
    element: (
      <RequireRole roles={['table']}>
        <MenuPage />
      </RequireRole>
    ),
  },
  {
    path: '/kitchen',
    element: (
      <RequireRole roles={['kitchen']}>
        <KitchenPage />
      </RequireRole>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
])
