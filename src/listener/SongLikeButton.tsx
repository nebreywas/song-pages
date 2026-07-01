type SongLikeButtonProps = {
  liked: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

/** Upper-right + toggle — outline when open, filled green when liked. */
export function SongLikeButton({ liked, disabled, onToggle }: SongLikeButtonProps) {
  return (
    <button
      type="button"
      className={`song-like-btn${liked ? ' is-liked' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      aria-pressed={liked}
      title={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
      </svg>
    </button>
  );
}
