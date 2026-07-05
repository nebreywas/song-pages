import { useEffect, useMemo, useState } from 'react';

import type { EffectiveGroupPresentation } from '@shared/vcMode/assignmentSettings';

import { getApp } from '../lib/bridge';
import { VcMediaPresentation } from './VcMediaPresentation';

type VcGraphicsGroupViewProps = {
  presentation: EffectiveGroupPresentation;
  animate?: boolean;
};

function useMemberUrls(members: EffectiveGroupPresentation['members']) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, string> = {};

    void (async () => {
      for (const member of members) {
        const resolved = await getApp()?.hostContent?.resolveMediaUrl(member.mediaPath);
        if (cancelled) return;
        if (resolved) next[member.id] = resolved;
      }
      if (!cancelled) setUrls(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [members]);

  return urls;
}

function SlideshowView({
  presentation,
  urls,
  animate,
}: {
  presentation: EffectiveGroupPresentation;
  urls: Record<string, string>;
  animate: boolean;
}) {
  const members = presentation.members.filter((member) => urls[member.id]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
  }, [presentation.members.map((m) => m.id).join('|')]);

  useEffect(() => {
    if (!animate || members.length <= 1) return;
    const intervalMs = presentation.frameTimeSec * 1000;
    const timer = window.setInterval(() => {
      if (presentation.slideshowTransition === 'none') {
        setIndex((value) => {
          const next = (value + 1) % members.length;
          if (presentation.slideshowPlayback === 'once' && next === 0 && value === members.length - 1) {
            window.clearInterval(timer);
          }
          return next;
        });
        return;
      }

      setVisible(false);
      window.setTimeout(() => {
        setIndex((value) => {
          const next = (value + 1) % members.length;
          if (presentation.slideshowPlayback === 'once' && next === 0 && value === members.length - 1) {
            window.clearInterval(timer);
          }
          return next;
        });
        setVisible(true);
      }, 220);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [animate, members.length, presentation]);

  const member = members[index];
  const src = member ? urls[member.id] : null;
  if (!src || !member) return <div className="vc-cell-empty" />;

  const transitionClass =
    presentation.slideshowTransition === 'flip'
      ? 'vc-group-slide-flip'
      : presentation.slideshowTransition === 'fade'
        ? 'vc-group-slide-fade'
        : '';

  return (
    <div className={`vc-group-slideshow ${transitionClass}${visible ? ' is-visible' : ''}`}>
      <VcMediaPresentation
        kind="graphic"
        src={src}
        presentation={{
          insetPct: 0,
          fitMode: 'max-x',
          overflow: 'static',
          widthPx: member.widthPx,
          heightPx: member.heightPx,
        }}
      />
    </div>
  );
}

function GalleryView({
  presentation,
  urls,
}: {
  presentation: EffectiveGroupPresentation;
  urls: Record<string, string>;
}) {
  const members = presentation.members.filter((member) => urls[member.id]);
  const [focusIndex, setFocusIndex] = useState(0);

  const visibleMembers = useMemo(() => {
    if (members.length === 0) return [];
    const max = Math.min(presentation.maxVisible, members.length);
    const items = [];
    for (let offset = 0; offset < max; offset += 1) {
      items.push(members[(focusIndex + offset) % members.length]);
    }
    return items;
  }, [focusIndex, members, presentation.maxVisible]);

  if (members.length === 0) return <div className="vc-cell-empty" />;

  if (presentation.galleryLayout === 'static') {
    return (
      <div className="vc-group-gallery vc-group-gallery-static">
        {visibleMembers.map((member) => (
          <img key={member.id} className="vc-group-thumb" src={urls[member.id]} alt="" />
        ))}
      </div>
    );
  }

  if (presentation.galleryLayout === 'scroll') {
    return (
      <div className="vc-group-gallery vc-group-gallery-scroll">
        {members.map((member) => (
          <img key={member.id} className="vc-group-thumb" src={urls[member.id]} alt="" />
        ))}
      </div>
    );
  }

  return (
    <div className="vc-group-gallery vc-group-gallery-coverflow">
      {visibleMembers.map((member, layerIndex) => {
        const offset = layerIndex - Math.floor(visibleMembers.length / 2);
        return (
          <button
            key={member.id}
            type="button"
            className="vc-group-coverflow-item"
            style={{
              transform: `translateX(${offset * 42}%) scale(${layerIndex === Math.floor(visibleMembers.length / 2) ? 1 : 0.82})`,
              zIndex: 10 - Math.abs(offset),
            }}
            onClick={() => setFocusIndex(members.findIndex((m) => m.id === member.id))}
          >
            <img src={urls[member.id]} alt="" />
          </button>
        );
      })}
    </div>
  );
}

/** Graphics group runtime — slideshow or gallery per assignment settings. */
export function VcGraphicsGroupView({ presentation, animate = true }: VcGraphicsGroupViewProps) {
  const urls = useMemberUrls(presentation.members);

  if (presentation.presentationMode === 'gallery') {
    return <GalleryView presentation={presentation} urls={urls} />;
  }

  return <SlideshowView presentation={presentation} urls={urls} animate={animate} />;
}
