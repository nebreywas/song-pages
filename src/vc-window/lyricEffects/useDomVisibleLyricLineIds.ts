/**
 * Track which ALARE lyric lines actually intersect the lyrics viewport.
 * Index-based “visibleRadius” drifts from Pretty’s variable line heights mid-song;
 * IntersectionObserver matches what the user can see.
 */

import { useEffect, useState, type RefObject } from 'react';

const LINE_SELECTOR = '.vc-alare-lyrics-line[data-line-id]';

/**
 * Returns a stable-enough Set of line ids currently intersecting the viewport.
 * Rebuilds observers when the corpus / typography remounts (resetKey).
 */
export function useDomVisibleLyricLineIds(
  containerRef: RefObject<HTMLElement | null>,
  resetKey: string | null,
  enabled: boolean,
): ReadonlySet<string> {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!enabled) {
      setIds(new Set());
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const viewport =
      container.querySelector<HTMLElement>('.vc-alare-lyrics-viewport') ?? container;

    const visible = new Set<string>();
    let raf = 0;

    const publish = () => {
      raf = 0;
      setIds((prev) => {
        if (prev.size === visible.size) {
          let same = true;
          for (const id of visible) {
            if (!prev.has(id)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return new Set(visible);
      });
    };

    const schedulePublish = () => {
      if (raf) return;
      raf = requestAnimationFrame(publish);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.lineId;
          if (!id) continue;
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
        }
        schedulePublish();
      },
      {
        root: viewport,
        // No vertical inset — top and bottom edge lines must stay equal candidates.
        threshold: [0, 0.01, 0.1],
      },
    );

    const observeAll = () => {
      observer.disconnect();
      visible.clear();
      const nodes = container.querySelectorAll<HTMLElement>(LINE_SELECTOR);
      for (const node of nodes) {
        observer.observe(node);
      }
      schedulePublish();
    };

    observeAll();

    // Soft-breaks / Pretty remounts change the line node set without changing resetKey.
    const mutation = new MutationObserver(() => observeAll());
    mutation.observe(container, { childList: true, subtree: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      mutation.disconnect();
      observer.disconnect();
    };
  }, [containerRef, enabled, resetKey]);

  return ids;
}
