import type { ReactNode } from 'react'
import { Card } from '../../shared/ui/Section.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { Duration, Statistics } from './api.ts'
import { formatDuration, shortDay } from './logic.ts'
import { SalesChart } from './SalesChart.tsx'

const METHOD_LABELS = { cash: 'Efectivo', card: 'Tarjeta', other: 'Otro' } as const

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {detail && <p className="text-xs text-muted">{detail}</p>}
    </Card>
  )
}

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </Card>
  )
}

interface Column<Row> {
  header: string
  cell: (row: Row) => ReactNode
  numeric?: boolean
}

function Table<Row>({ rows, columns, rowKey, empty }: { rows: Row[]; columns: Column<Row>[]; rowKey: (row: Row) => string; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            {columns.map((column) => (
              <th key={column.header} scope="col" className={`py-2 pr-4 font-medium ${column.numeric ? 'text-right whitespace-nowrap' : ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0">
              {columns.map((column) => (
                <td key={column.header} className={`py-2 pr-4 text-ink ${column.numeric ? 'text-right whitespace-nowrap tabular-nums' : ''}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function DurationTile({ label, duration }: { label: string; duration: Duration }) {
  return (
    <Tile
      label={label}
      value={formatDuration(duration.median_seconds)}
      detail={duration.count === 0 ? 'Nada medido aún' : `Mediana · promedio ${formatDuration(duration.average_seconds)} · ${duration.count} ${duration.count === 1 ? 'medición' : 'mediciones'}`}
    />
  )
}

function durationCell(duration: Duration): string {
  return duration.count === 0 ? '—' : `${formatDuration(duration.median_seconds)} / ${formatDuration(duration.average_seconds)}`
}

/** Every figure of a range: totals, the daily chart and its table, methods, tables, products and times. */
export function StatsReport({ stats }: { stats: Statistics }) {
  const { totals, times } = stats
  const amountColumns = [
    { header: 'Cobrado', cell: (row: { collected_cents: number }) => formatMoney(row.collected_cents), numeric: true },
    { header: 'Aún sin cobrar', cell: (row: { pending_cents: number }) => formatMoney(row.pending_cents), numeric: true },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Cobrado" value={formatMoney(totals.collected_cents)} detail={plural(totals.paid_bills, 'cuenta pagada', 'cuentas pagadas')} />
        <Tile label="Ticket promedio" value={formatMoney(totals.average_ticket_cents)} detail="Cobrado por cuenta pagada" />
        <Tile
          label="Pedido, aún sin cobrar"
          value={formatMoney(totals.pending_cents)}
          detail={`${plural(totals.pending_orders, 'orden', 'órdenes')} en cuentas abiertas`}
        />
        <Tile label="Tiempo total de la orden" value={formatDuration(times.order.median_seconds)} detail={times.order.count === 0 ? 'No hay órdenes completadas' : `Mediana de ${plural(times.order.count, 'orden completada', 'órdenes completadas')}`} />
      </div>

      <Block title="Ventas por día" description="Lo cobrado cuenta en el día del pago; lo aún sin cobrar, en el día en que se envió la orden.">
        <SalesChart days={stats.days} />
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-ink-soft">Cifras diarias</summary>
          <div className="mt-3">
            <Table
              rows={stats.days}
              rowKey={(day) => day.date}
              empty="No hay días en este rango."
              columns={[{ header: 'Día', cell: (day) => shortDay(day.date) }, ...amountColumns]}
            />
          </div>
        </details>
      </Block>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Métodos de pago" description="Cuentas pagadas en este rango.">
          <Table
            rows={stats.payment_methods}
            rowKey={(row) => row.method}
            empty="No hay pagos."
            columns={[
              { header: 'Método', cell: (row) => METHOD_LABELS[row.method] },
              { header: 'Cuentas', cell: (row) => row.bills, numeric: true },
              { header: 'Monto', cell: (row) => formatMoney(row.amount_cents), numeric: true },
            ]}
          />
        </Block>
        <Block title="Órdenes por mesa" description="Órdenes enviadas en este rango, sin contar los platillos cancelados.">
          <Table
            rows={stats.tables}
            rowKey={(row) => row.table_id}
            empty="No hay órdenes en este rango."
            columns={[
              { header: 'Mesa', cell: (row) => row.name },
              { header: 'Órdenes', cell: (row) => row.orders, numeric: true },
              ...amountColumns,
            ]}
          />
        </Block>
      </div>

      <Block title="Productos más vendidos" description="Platillos pedidos en este rango, sin contar los cancelados, del más vendido al menos vendido.">
        <Table
          rows={stats.products}
          rowKey={(row) => row.item_id}
          empty="No se pidió nada en este rango."
          columns={[
            { header: 'Producto', cell: (row) => row.name },
            { header: 'Vendidos', cell: (row) => row.quantity, numeric: true },
            ...amountColumns,
          ]}
        />
      </Block>

      <Block title="Tiempos" description="La mediana muestra el caso típico; una sola orden olvidada no la mueve. El promedio aparece junto a ella.">
        <div className="grid gap-4 sm:grid-cols-3">
          <DurationTile label="Espera en la cola" duration={times.queue} />
          <DurationTile label="Preparación" duration={times.preparation} />
          <DurationTile label="Espera de entrega" duration={times.delivery} />
        </div>
        <Table
          rows={times.products}
          rowKey={(row) => row.item_id}
          empty="No hay platillos medidos en este rango."
          columns={[
            { header: 'Producto (mediana / promedio)', cell: (row) => row.name },
            { header: 'Cola', cell: (row) => durationCell(row.queue), numeric: true },
            { header: 'Preparación', cell: (row) => durationCell(row.preparation), numeric: true },
            { header: 'Entrega', cell: (row) => durationCell(row.delivery), numeric: true },
          ]}
        />
      </Block>
    </div>
  )
}
