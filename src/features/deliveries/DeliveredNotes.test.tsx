import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeliveredNotes } from './DeliveredNotes.tsx'

describe('DeliveredNotes', () => {
  it('shows each delivered order as a note, completed ones included', () => {
    const html = renderToStaticMarkup(
      <DeliveredNotes
        notes={[
          { order_id: 'o9', table_name: 'Table 1', order_number: 9, sent_at: '2026-10-28T12:30:00Z', delivered: ['1 × Dish d'], pending: 0 },
          { order_id: 'o7', table_name: 'Table 2', order_number: 7, sent_at: '2026-10-28T12:00:00Z', delivered: ['2 × Dish a'], pending: 2 },
        ]}
      />,
    )
    expect(html).toContain('Table 1 · Orden #9')
    expect(html).toContain('1 × Dish d')
    expect(html).toContain('Orden completa')
    expect(html).toContain('Faltan 2 platillos')
  })

  it('says so when nothing was delivered yet', () => {
    expect(renderToStaticMarkup(<DeliveredNotes notes={[]} />)).toContain('Todavía no entregas nada')
  })
})
