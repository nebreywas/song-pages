import { useEffect } from 'react';

type SongCoverPopoverProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

/** Close-up cover art overlay — click the image or backdrop to dismiss. */
export function SongCoverPopover({ src, alt, onClose }: SongCoverPopoverProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="song-cover-popover" role="dialog" aria-modal="true" aria-label="Cover art">
      <button type="button" className="song-cover-popover-backdrop" aria-label="Close cover art" onClick={onClose} />
      <button type="button" className="song-cover-popover-image-btn" aria-label="Close cover art" onClick={onClose}>
        <img className="song-cover-popover-image" src={src} alt={alt} />
      </button>
    </div>
  );
}
