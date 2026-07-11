/** Step through an ordered visualizer catalog (wraps at ends). */
export function stepExperienceId(
  orderedIds: readonly string[],
  currentId: string,
  direction: 1 | -1,
  normalizeId: (id: string) => string = (id) => id,
): string {
  if (orderedIds.length === 0) return currentId;

  const normalizedCurrent = normalizeId(currentId);
  let index = orderedIds.findIndex((id) => normalizeId(id) === normalizedCurrent);
  if (index < 0) index = 0;

  const nextIndex = (index + direction + orderedIds.length) % orderedIds.length;
  return orderedIds[nextIndex]!;
}
