/** Turn TanStack Form errors (strings or Standard Schema issues) into text. */
export function errorText(errors: ReadonlyArray<unknown>): string | undefined {
  for (const e of errors) {
    if (!e) continue
    if (typeof e === "string") return e
    if (typeof e === "object" && "message" in e) return String(e.message)
  }
  return undefined
}

type FieldMeta = { isTouched: boolean; errors: ReadonlyArray<unknown> }

/** Errors are only shown once the user has interacted with the field. */
export function visibleError(meta: FieldMeta) {
  return meta.isTouched ? errorText(meta.errors) : undefined
}
