import { createBrowserRouter } from 'react-router'
import { RequireRole } from '../features/auth/RequireRole.tsx'
import { CatalogPanel } from '../features/catalog/CatalogPanel.tsx'
import { ModifiersPanel } from '../features/modifiers/ModifiersPanel.tsx'
import { OrderSettingsPanel } from '../features/settings/OrderSettingsPanel.tsx'
import { StatsPanel } from '../features/stats/StatsPanel.tsx'
import { StaffPanel } from '../features/staff/StaffPanel.tsx'
import { AdminsPanel } from '../features/admins/AdminsPanel.tsx'
import { AccountPanel } from '../features/account/AccountPanel.tsx'
import { TablesPanel } from '../features/tables/TablesPanel.tsx'
import { ThemeEditorPanel } from '../features/theming/ThemeEditorPanel.tsx'
import { AdminPage } from '../pages/admin/AdminPage.tsx'
import { HomePage } from '../pages/HomePage.tsx'
import { JoinTablePage } from '../pages/JoinTablePage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { MenuPage } from '../pages/menu/MenuPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { RegisterPage } from '../pages/RegisterPage.tsx'
import { KitchenPage } from '../pages/staff/KitchenPage.tsx'
import { WaiterPage } from '../pages/staff/WaiterPage.tsx'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  // A business owner signs up alone and lands in the admin panel of the new business.
  { path: '/register', element: <RegisterPage /> },
  // Printed in each table's QR: guests join the table's open visit from their phones.
  { path: '/q/:token', element: <JoinTablePage /> },
  {
    path: '/admin',
    element: (
      <RequireRole roles={['admin']}>
        <AdminPage />
      </RequireRole>
    ),
    children: [
      { index: true, element: <CatalogPanel /> },
      { path: 'modifiers', element: <ModifiersPanel /> },
      { path: 'tables', element: <TablesPanel /> },
      { path: 'staff', element: <StaffPanel /> },
      { path: 'admins', element: <AdminsPanel /> },
      { path: 'account', element: <AccountPanel /> },
      { path: 'settings', element: <OrderSettingsPanel /> },
      { path: 'design', element: <ThemeEditorPanel /> },
      { path: 'stats', element: <StatsPanel /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/waiter',
    element: (
      <RequireRole roles={['waiter', 'admin']}>
        <WaiterPage />
      </RequireRole>
    ),
  },
  {
    path: '/menu',
    element: (
      <RequireRole roles={['table', 'guest']}>
        <MenuPage />
      </RequireRole>
    ),
  },
  {
    path: '/kitchen',
    element: (
      <RequireRole roles={['kitchen', 'admin']}>
        <KitchenPage />
      </RequireRole>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
])
