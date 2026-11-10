import { describe, expect, it } from 'vitest'
import { leavesWithUnsavedChanges } from './ThemeEditorPanel.leaving.ts'

describe('leavesWithUnsavedChanges', () => {
  it('asks when going to another page with unsaved changes', () => {
    expect(leavesWithUnsavedChanges(true, '/admin/design', '/admin/stats')).toBe(true)
  })

  it('lets a saved design leave freely', () => {
    expect(leavesWithUnsavedChanges(false, '/admin/design', '/admin/stats')).toBe(false)
  })

  it('does not ask when the page stays the same', () => {
    expect(leavesWithUnsavedChanges(true, '/admin/design', '/admin/design')).toBe(false)
  })
})
