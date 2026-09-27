/** Calendar days in the user's timezone; UTC ISO strings are reserved for instants. */
export const localDateKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Preserve numeric references in existing documents without millisecond collisions. */
export const createNumericId = (): number => {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return (values[0] & 0x1fffff) * 0x100000000 + values[1] || 1;
};

export const sameUserDataScope = (before: { firebaseUid?: string; role: string; clubId?: string } | null, after: { firebaseUid?: string; role: string; clubId?: string }): boolean =>
  Boolean(before && before.firebaseUid === after.firebaseUid && before.role === after.role && before.clubId === after.clubId);
