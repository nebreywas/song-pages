/** Measure the drawable spawn area for Kudo particles (handles preview boxes before layout). */
export function measureKudoSpawnArea(container: HTMLElement | null): { width: number; height: number } {
  if (!container) {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  const rect = container.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), container.clientWidth, container.offsetWidth);
  const height = Math.max(Math.round(rect.height), container.clientHeight, container.offsetHeight);

  if (width >= 8 && height >= 8) {
    return { width, height };
  }

  const parent = container.parentElement;
  if (parent) {
    const parentRect = parent.getBoundingClientRect();
    const parentW = Math.max(Math.round(parentRect.width), parent.clientWidth, parent.offsetWidth);
    const parentH = Math.max(Math.round(parentRect.height), parent.clientHeight, parent.offsetHeight);
    if (parentW >= 8 && parentH >= 8) {
      return { width: parentW, height: parentH };
    }
  }

  return { width: window.innerWidth, height: window.innerHeight };
}
