// Member dropdowns list people alphabetically by display name, which starts with the first name.
export function sortByName<T extends { displayName: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
}
