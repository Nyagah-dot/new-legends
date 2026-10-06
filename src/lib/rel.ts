/** An embedded Supabase relation (e.g. `plans(name)`), which the type checker may see as one object OR a list. */
export type Rel<T> = T | T[] | null | undefined;

/**
 * Supabase types an embedded relation as one object or as a list depending on whether it can tell how the
 * tables are linked. In our database these links are many-to-one, so at runtime it is a single object.
 * This returns that single object whichever way TypeScript sees it, so the build can't trip on it.
 */
export function one<T>(rel: Rel<T>): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}
