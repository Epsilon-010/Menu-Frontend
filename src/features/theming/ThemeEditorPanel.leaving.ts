/** Going to another page drops the edits in the draft: only then is it worth asking. */
export function leavesWithUnsavedChanges(dirty: boolean, from: string, to: string): boolean {
  return dirty && from !== to
}
