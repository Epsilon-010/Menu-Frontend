import type { ReactNode } from 'react'
import { Card } from '../../shared/ui/Section.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { Duration, Statistics } from './api.ts'
import { formatDuration, shortDay } from './logic.ts'
import { SalesChart } from './SalesChart.tsx'

const METHOD_LABELS = { cash: 'Cash', card: 'Card', other: 'Other' } as const

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
      detail={duration.count === 0 ? 'Nothing measured yet' : `Median · average ${formatDuration(duration.average_seconds)} · ${duration.count} measured`}
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
    { header: 'Collected', cell: (row: { collected_cents: number }) => formatMoney(row.collected_cents), numeric: true },
    { header: 'Not collected yet', cell: (row: { pending_cents: number }) => formatMoney(row.pending_cents), numeric: true },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Collected" value={formatMoney(totals.collected_cents)} detail={plural(totals.paid_bills, 'paid bill', 'paid bills')} />
        <Tile label="Average ticket" value={formatMoney(totals.average_ticket_cents)} detail="Collected per paid bill" />
        <Tile
          label="Ordered, not collected yet"
          value={formatMoney(totals.pending_cents)}
          detail={`${plural(totals.pending_orders, 'order', 'orders')} on open bills`}
        />
        <Tile label="Order total time" value={formatDuration(times.order.median_seconds)} detail={times.order.count === 0 ? 'No completed orders' : `Median of ${plural(times.order.count, 'completed order', 'completed orders')}`} />
      </div>

      <Block title="Sales per day" description="Collected is dated by the payment; not collected yet by when the order was sent.">
        <SalesChart days={stats.days} />
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-ink-soft">Daily figures</summary>
          <div className="mt-3">
            <Table
              rows={stats.days}
              rowKey={(day) => day.date}
              empty="No days in this range."
              columns={[{ header: 'Day', cell: (day) => shortDay(day.date) }, ...amountColumns]}
            />
          </div>
        </details>
      </Block>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Payment methods" description="Bills paid in this range.">
          <Table
            rows={stats.payment_methods}
            rowKey={(row) => row.method}
            empty="No payments."
            columns={[
              { header: 'Method', cell: (row) => METHOD_LABELS[row.method] },
              { header: 'Bills', cell: (row) => row.bills, numeric: true },
              { header: 'Amount', cell: (row) => formatMoney(row.amount_cents), numeric: true },
            ]}
          />
        </Block>
        <Block title="Orders by table" description="Orders sent in this range, cancelled dishes left out.">
          <Table
            rows={stats.tables}
            rowKey={(row) => row.table_id}
            empty="No orders in this range."
            columns={[
              { header: 'Table', cell: (row) => row.name },
              { header: 'Orders', cell: (row) => row.orders, numeric: true },
              ...amountColumns,
            ]}
          />
        </Block>
      </div>

      <Block title="Best-selling products" description="Dishes ordered in this range, cancelled ones left out, most sold first.">
        <Table
          rows={stats.products}
          rowKey={(row) => row.item_id}
          empty="Nothing ordered in this range."
          columns={[
            { header: 'Product', cell: (row) => row.name },
            { header: 'Sold', cell: (row) => row.quantity, numeric: true },
            ...amountColumns,
          ]}
        />
      </Block>

      <Block title="Times" description="Median, the typical case; a single forgotten order cannot move it. The average is shown beside it.">
        <div className="grid gap-4 sm:grid-cols-3">
          <DurationTile label="Waiting in the queue" duration={times.queue} />
          <DurationTile label="Preparation" duration={times.preparation} />
          <DurationTile label="Waiting for delivery" duration={times.delivery} />
        </div>
        <Table
          rows={times.products}
          rowKey={(row) => row.item_id}
          empty="No dishes measured in this range."
          columns={[
            { header: 'Product (median / average)', cell: (row) => row.name },
            { header: 'Queue', cell: (row) => durationCell(row.queue), numeric: true },
            { header: 'Preparation', cell: (row) => durationCell(row.preparation), numeric: true },
            { header: 'Delivery', cell: (row) => durationCell(row.delivery), numeric: true },
          ]}
        />
      </Block>
    </div>
  )
}
