import { CheckCircleIcon, ReceiptIcon, ShoppingBagIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../features/auth/useAuth.ts'
import { useSessionHeartbeat } from '../../features/auth/useSessionHeartbeat.ts'
import { formatMoney } from '../../features/catalog/price.ts'
import type { Cart, Order } from '../../features/ordering/api.ts'
import { BillRequestControl } from '../../features/ordering/BillRequestControl.tsx'
import { CartContents } from '../../features/ordering/CartContents.tsx'
import { dishCount } from '../../features/ordering/logic.ts'
import { MenuBrowser } from '../../features/ordering/MenuBrowser.tsx'
import { OrderCard } from '../../features/ordering/OrderCard.tsx'
import { SendConfirmation } from '../../features/ordering/SendConfirmation.tsx'
import { useTableOrdering, type Loadable, type TableOrdering } from '../../features/ordering/useTableOrdering.ts'
import type { CartStyle } from '../../features/theming/api.ts'
import { DEFAULT_LAYOUT } from '../../features/theming/layout.ts'
import { MenuHero } from '../../features/theming/MenuHero.tsx'
import { ThemeScope } from '../../features/theming/ThemeScope.tsx'
import { usePublishedTheme } from '../../features/theming/usePublishedTheme.ts'
import { AppShell } from '../../shared/ui/AppShell.tsx'
import { IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { EmptyState, ListSkeleton, LoadError, Skeleton } from '../../shared/ui/Feedback.tsx'
import { Card } from '../../shared/ui/Section.tsx'

const NOTICE_MS = 6_000

/**
 * Where the table order lives. The side panel shows from large screens (bar) or tablets (panel); below it a bottom
 * bar opens the full order. Floating: a button in the corner at every size, and the menu gets the whole width.
 */
const CART_PLACEMENT: Record<CartStyle, { grid: string; main: string; aside: string; compact: string; notice: string }> = {
  bar: { grid: 'lg:grid-cols-3 lg:pb-0', main: 'lg:col-span-2', aside: 'hidden lg:block', compact: 'lg:hidden', notice: 'lg:bottom-8' },
  panel: { grid: 'md:grid-cols-3 md:pb-0', main: 'md:col-span-2', aside: 'hidden md:block', compact: 'md:hidden', notice: 'md:bottom-8' },
  floating: { grid: '', main: '', aside: 'hidden', compact: '', notice: '' },
}

function MenuSkeleton() {
  return (
    <div role="status" aria-label="Loading the menu" className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

interface CartAreaProps {
  cart: Loadable<Cart>
  ordering: TableOrdering
  onSend: () => void
}

function CartArea({ cart, ordering, onSend }: CartAreaProps) {
  if (cart.status === 'loading') return <ListSkeleton rows={2} label="Loading the table order" />
  if (cart.status === 'error') return <LoadError message={cart.message} onRetry={ordering.retryCart} />
  return (
    <CartContents cart={cart.data} onChange={ordering.changeLine} onRemove={ordering.removeLine} onSend={onSend} />
  )
}

function OrdersArea({ orders }: { orders: Loadable<Order[]> }) {
  if (orders.status === 'loading') return <ListSkeleton rows={2} label="Loading the orders" />
  if (orders.status === 'error') return null
  if (orders.data.length === 0) {
    return (
      <EmptyState icon={<ReceiptIcon size={24} aria-hidden />} title="No orders sent yet">
        Orders sent from this table show up here with the status of every dish.
      </EmptyState>
    )
  }
  return (
    <div className="grid gap-4 @2xl:grid-cols-2">
      {orders.data.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}

/**
 * The table's menu, for its tablet and for guests who scanned its QR. Everyone shares one cart in
 * the backend and sees what the others add; anyone can send it after reviewing the summary.
 * The tablet has no sign out button: the admin signs it out by deactivating the table or issuing
 * a new PIN. A guest may leave.
 */
export function MenuPage() {
  const { state, signOut } = useAuth()
  // Notices right away when the admin deactivates the table or the visit ends.
  useSessionHeartbeat()
  const ordering = useTableOrdering()
  const published = usePublishedTheme()
  const [confirming, setConfirming] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (notice === null) return
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (state.status !== 'authenticated' || state.account.table === null) return null
  const { table, tenant, guest } = state.account
  const { menu, cart, orders } = ordering

  function openConfirmation() {
    setSheetOpen(false)
    setConfirming(true)
  }

  function handleSent(order: Order) {
    setConfirming(false)
    setNotice(`Order #${order.number} sent`)
  }

  async function handleLeave() {
    setLeaving(true)
    await signOut()
  }

  const loadedCart = cart.status === 'loaded' ? cart.data : null
  const count = loadedCart ? dishCount(loadedCart) : 0
  const theme = published.status === 'loaded' ? published.data : null
  const logoId = theme?.theme.brand.logo.image_id
  const logoUrl = theme && logoId ? theme.image_urls[logoId] : undefined
  const layout = theme?.theme.layout ?? DEFAULT_LAYOUT
  const placement = CART_PLACEMENT[layout.cart]

  if (published.status === 'loading') {
    // A moment at most (the theme is cached): avoids showing the neutral look before the business's.
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24">
        <MenuSkeleton />
      </div>
    )
  }

  const page = (
    <AppShell
      business={theme?.theme.brand.name || tenant.name}
      logoUrl={logoUrl}
      identity={guest ? `${table.name} · ${guest.name}` : table.name}
      onSignOut={guest ? () => void handleLeave() : undefined}
      signingOut={leaving}
      signOutLabel="Leave"
      fixedBar={layout.sticky_header}
    >
      <div className={`grid gap-8 pb-24 ${placement.grid}`}>
        <div className={`min-w-0 space-y-12 ${placement.main}`}>
          {theme && <MenuHero theme={theme.theme} imageUrls={theme.image_urls} businessName={tenant.name} />}
          {menu.status === 'loading' && <MenuSkeleton />}
          {menu.status === 'error' && <LoadError message={menu.message} onRetry={ordering.retryMenu} />}
          {menu.status === 'loaded' && (
            <MenuBrowser categories={menu.data} onAdd={ordering.addLine} layout={layout} belowFixedBar={layout.sticky_header} />
          )}

          <section aria-labelledby="orders-title" className="space-y-4">
            <h2 id="orders-title" className="text-xl font-semibold tracking-tight text-ink">
              Orders from this table
            </h2>
            <OrdersArea orders={orders} />
            {orders.status === 'loaded' && orders.data.length > 0 && (
              <BillRequestControl requestedAt={ordering.billRequestedAt} onChange={ordering.setBillRequest} />
            )}
          </section>
        </div>

        <aside aria-label="Table order" className={placement.aside}>
          <Card
            className={`sticky max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto p-4 ${layout.sticky_header ? 'top-24' : 'top-4'}`}
          >
            <h2 className="text-lg font-semibold tracking-tight text-ink">Table order</h2>
            <CartArea cart={cart} ordering={ordering} onSend={openConfirmation} />
          </Card>
        </aside>
      </div>

      {/* Without the side panel: a bottom bar (or a corner button) with the running total that opens the full order. */}
      <div
        className={`fixed bottom-0 z-20 p-4 ${layout.cart === 'floating' ? 'right-0' : 'inset-x-0'} ${placement.compact}`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          aria-expanded={sheetOpen}
          aria-controls="cart-sheet"
          onClick={() => setSheetOpen(true)}
          className={`flex items-center justify-between gap-4 bg-cart px-4 py-3 text-cart-ink shadow-lg hover:bg-cart/90 active:scale-[0.98] ${MOTION} ${
            layout.cart === 'floating' ? 'rounded-full' : 'mx-auto w-full max-w-lg rounded-2xl'
          }`}
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBagIcon size={20} aria-hidden />
            Table order
            {count > 0 && <span className="rounded-md bg-badge px-2 text-sm text-badge-ink tabular-nums">{count}</span>}
          </span>
          <span className="text-base font-semibold tabular-nums">{formatMoney(loadedCart?.total_cents ?? 0)}</span>
        </button>
      </div>

      <div
        id="cart-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Table order"
        inert={!sheetOpen}
        className={`fixed inset-0 z-30 overflow-y-auto bg-canvas/95 px-4 pt-24 pb-8 backdrop-blur-xl transition-opacity duration-500 ease-smooth ${placement.compact} ${
          sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Table order</h2>
            <IconButton label="Close the order" icon={<XIcon size={20} />} onClick={() => setSheetOpen(false)} />
          </div>
          <Card className="p-4">
            <CartArea cart={cart} ordering={ordering} onSend={openConfirmation} />
          </Card>
        </div>
      </div>

      {confirming && loadedCart && (
        <SendConfirmation
          liveCart={loadedCart}
          onSend={ordering.send}
          onSent={handleSent}
          onClose={() => setConfirming(false)}
        />
      )}

      {notice && (
        <div className={`pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 ${placement.notice}`}>
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <CheckCircleIcon size={16} aria-hidden />
            {notice}
          </p>
        </div>
      )}
    </AppShell>
  )

  // Still a size container: the menu lays out by its own width (two columns from tablets up).
  if (!theme) return <div className="@container">{page}</div>
  return (
    <ThemeScope theme={theme.theme} imageUrls={theme.image_urls} className="min-h-screen">
      {page}
    </ThemeScope>
  )
}
