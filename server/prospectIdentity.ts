/** Stable numeric identity for public-form prospects created before an id was written. */
export function legacyProspectNumericId(uid: string): number {
  let hash = 14695981039346656037n;
  for (const byte of new TextEncoder().encode(uid)) hash = ((hash ^ BigInt(byte)) * 1099511628211n) & ((1n << 64n) - 1n);
  return Number(3000000000000n + hash % 1000000000000n);
}
