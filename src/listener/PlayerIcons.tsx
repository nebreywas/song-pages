import type { ReactNode } from 'react';

type IconProps = {
  className?: string;
};

/** Shared wrapper — paths from /images noun SVGs, tinted via currentColor. */
function PlayerIcon({ className, children, viewBox = '0 0 1200 1200' }: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true" fill="currentColor">
      {children}
    </svg>
  );
}

/** images/noun-previous-1939964.svg */
export function IconPrevious({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m1048.8 134.4-602.4 400.8c-46.801 31.199-46.801 98.398 0 129.6l602.4 400.8c51.602 34.801 121.2-2.3984 121.2-64.801l0.003906-801.6c0-62.398-69.602-99.598-121.2-64.801z" />
      <path d="m238.8 121.2h-170.4c-21.602 0-38.398 18-38.398 38.398v879.6c0 21.602 18 38.398 38.398 38.398h169.2c21.602 0 38.398-18 38.398-38.398l0.003906-879.6c1.1992-21.602-16.801-38.402-37.199-38.402z" />
    </PlayerIcon>
  );
}

/** images/noun-play-1939965.svg */
export function IconPlay({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m1010.4 523.2-717.6-477.6c-61.199-40.801-144 3.6016-144 76.801v954c0 74.398 82.801 117.6 144 76.801l717.6-477.6c53.996-34.801 53.996-116.4-0.003906-152.4z" />
    </PlayerIcon>
  );
}

/** images/noun-pause-1939967.svg */
export function IconPause({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m427.2 30h-267.6c-25.199 0-46.801 20.398-46.801 46.801v1047.6c0 25.199 20.398 46.801 46.801 46.801h266.4c25.199 0 46.801-20.398 46.801-46.801v-1047.6c0-26.402-20.402-46.801-45.602-46.801z" />
      <path d="m1040.4 30h-267.6c-25.199 0-46.801 20.398-46.801 46.801v1047.6c0 25.199 20.398 46.801 46.801 46.801h266.4c25.199 0 46.801-20.398 46.801-46.801v-1047.6c0-26.402-20.398-46.801-45.602-46.801z" />
    </PlayerIcon>
  );
}

/** images/noun-next-1939966.svg */
export function IconNext({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m151.2 1065.6 602.4-400.8c46.801-31.199 46.801-98.398 0-129.6l-602.4-400.8c-51.598-34.797-121.2 2.4023-121.2 64.801v801.6c0 62.398 69.602 99.598 121.2 64.801z" />
      <path d="m961.2 1078.8h169.2c21.602 0 38.398-18 38.398-38.398l0.003906-880.8c0-21.602-18-38.398-38.398-38.398l-169.2-0.003906c-21.602 0-38.398 18-38.398 38.398v879.6c0 22.801 18 39.602 38.398 39.602z" />
    </PlayerIcon>
  );
}

/** images/noun-sound-1939979.svg */
export function IconVolume({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m866.4 398.4c-24-19.199-60-16.801-80.398 8.3984s-15.602 61.199 9.6016 81.602c32.398 26.398 52.801 67.199 52.801 111.6 0 48-22.801 90-58.801 116.4-22.801 16.801-26.398 50.398-8.3984 72l4.8008 4.8008c19.199 22.801 55.199 27.602 78 9.6016 60-46.801 98.398-121.2 98.398-202.8-0.003906-81.602-37.203-153.6-96.004-201.6z" />
      <path d="m997.2 237.6c-24-19.199-58.801-14.398-79.199 8.3984-19.199 24-16.801 60 7.1992 79.199 79.199 66 130.8 164.4 130.8 274.8s-51.602 210-130.8 274.8c-24 19.199-26.398 55.199-7.1992 79.199s55.199 28.801 79.199 9.6016c105.6-85.199 174-216 174-362.4-1.1992-147.6-68.398-278.4-174-363.6z" />
      <path d="m531.6 150-291.6 224.4h-142.8c-37.199 0-67.199 30-67.199 67.199v316.8c0 37.199 30 67.199 67.199 67.199l142.8 0.003906 292.8 224.4c51.602 39.602 124.8 3.6016 124.8-62.398v-776.4c0-63.598-74.402-100.8-126-61.199z" />
    </PlayerIcon>
  );
}

/** images/noun-mute-1939974.svg */
export function IconVolumeMuted({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m519.6 162-285.6 218.4h-138c-36 0-66 28.801-66 66v308.4c0 36 28.801 66 66 66h139.2l284.4 218.4c49.199 38.398 122.4 2.3984 122.4-60l0.003906-757.2c-1.1992-63.602-73.199-98.398-122.4-60z" />
      <path d="m1071.6 600 86.398-86.398c14.398-14.398 14.398-38.398 0-54l-40.801-40.801c-14.398-14.398-38.398-14.398-54 0l-86.398 86.398-86.398-86.398c-14.398-14.398-38.398-14.398-54 0l-40.801 40.801c-14.398 14.398-14.398 38.398 0 54l86.398 86.398-86.398 86.398c-14.398 14.398-14.398 38.398 0 54l40.801 40.801c14.398 14.398 38.398 14.398 54 0l86.398-86.398 86.398 86.398c14.398 14.398 38.398 14.398 54 0l40.801-40.801c14.398-14.398 14.398-38.398 0-54z" />
    </PlayerIcon>
  );
}

/** images/noun-shuffle-1766485.svg */
export function IconShuffle({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m313.2 730.8c-13.199 14.398-31.199 24-51.602 24h-169.2c-34.801 0-62.398 27.602-62.398 62.398 0 34.801 27.602 62.398 62.398 62.398h169.2c56.398 0 109.2-24 146.4-67.199l60-69.602-82.801-96z" />
      <path d="m703.2 469.2c13.199-14.398 31.199-24 51.602-24h159.6v72c0 28.801 32.398 45.602 55.199 28.801l186-134.4c19.199-14.398 19.199-43.199 0-56.398l-186-135.6c-22.801-16.801-55.199 0-55.199 28.801v72l-159.6-0.003906c-56.398 0-109.2 24-146.4 67.199l-60 69.602 82.801 96z" />
      <path d="m1155.6 788.4-186-134.4c-22.801-16.801-55.199 0-55.199 28.801v72h-159.6c-19.199 0-38.398-8.3984-51.602-24l-295.2-343.2c-37.199-43.199-90-67.199-146.4-67.199l-169.2-0.003906c-34.801 0-62.398 27.602-62.398 62.398 0 34.801 27.602 62.398 62.398 62.398h169.2c19.199 0 38.398 8.3984 51.602 24l295.2 343.2c37.199 43.199 90 67.199 146.4 67.199h159.6v72c0 28.801 32.398 45.602 55.199 28.801l186-134.4c19.203-14.395 19.203-43.195 0.003906-57.598z" />
    </PlayerIcon>
  );
}

/** images/noun-repeat-1382675.svg */
export function IconRepeat({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m1096.8 434.4c-40.801 0-73.199 32.398-73.199 73.199v252c0 63.602-51.602 115.2-115.2 115.2l-543.6 0.003906v-92.398c0-28.801-32.398-44.398-55.199-27.602l-217.2 165.6c-18 13.199-18 40.801 0 55.199l217.2 164.4c22.801 16.801 55.199 1.1992 55.199-27.602v-92.398h544.8c144 0 261.6-117.6 261.6-261.6v-252c-1.2031-39.598-33.602-72-74.402-72z" />
      <path d="m175.2 692.4v-252c0-63.602 51.602-115.2 115.2-115.2h544.8v92.398c0 28.801 32.398 44.398 55.199 27.602l217.2-165.6c18-13.199 18-40.801 0-55.199l-217.2-164.4c-22.801-16.801-55.199-1.1992-55.199 27.602v92.398h-543.6c-144 0-261.6 117.6-261.6 261.6v252c0 40.801 32.398 73.199 73.199 73.199s72-33.602 72-74.402z" />
    </PlayerIcon>
  );
}

/** Repeat-one: noun repeat plus a centered numeral. */
export function IconRepeatOne({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path d="m1096.8 434.4c-40.801 0-73.199 32.398-73.199 73.199v252c0 63.602-51.602 115.2-115.2 115.2l-543.6 0.003906v-92.398c0-28.801-32.398-44.398-55.199-27.602l-217.2 165.6c-18 13.199-18 40.801 0 55.199l217.2 164.4c22.801 16.801 55.199 1.1992 55.199-27.602v-92.398h544.8c144 0 261.6-117.6 261.6-261.6v-252c-1.2031-39.598-33.602-72-74.402-72z" />
      <path d="m175.2 692.4v-252c0-63.602 51.602-115.2 115.2-115.2h544.8v92.398c0 28.801 32.398 44.398 55.199 27.602l217.2-165.6c18-13.199 18-40.801 0-55.199l-217.2-164.4c-22.801-16.801-55.199-1.1992-55.199 27.602v92.398h-543.6c-144 0-261.6 117.6-261.6 261.6v252c0 40.801 32.398 73.199 73.199 73.199s72-33.602 72-74.402z" />
      <text x="600" y="700" textAnchor="middle" fontSize="320" fontWeight="700" fill="currentColor">
        1
      </text>
    </PlayerIcon>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <PlayerIcon className={className} viewBox="0 0 24 24">
      <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </PlayerIcon>
  );
}

export function IconAdd({ className }: IconProps) {
  return (
    <PlayerIcon className={className} viewBox="0 0 24 24">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </PlayerIcon>
  );
}

/** images/noun-numbered-list-7706012.svg — Artists & Playlists sidebar reorder toggle. */
export function IconSidebarOrder({ className }: IconProps) {
  return (
    <PlayerIcon className={className}>
      <path
        fillRule="evenodd"
        d="m239.39 350.02v-210h-98.391v45.891h39v164.11zm860.63-150h-700.03v99.984h700.03zm-817.31 452.9v47.062h-163.5v-37.172l78.609-73.5c7.5938-7.2188 12.703-13.312 15.328-18.328 2.5781-5.2031 3.8906-10.406 3.8906-15.562 0-6.8438-2.2969-12.141-6.8906-15.938s-11.297-5.6719-20.109-5.6719c-7.8281 0-15 1.7812-21.609 5.3906-6.375 3.375-11.719 8.3906-15.891 15l-44.109-24.609c8.2031-13.594 19.688-24.281 34.5-32.109 14.812-7.7812 32.297-11.672 52.5-11.672 15.984 0 30.094 2.5781 42.281 7.7812 12.422 5.2031 22.031 12.703 28.828 22.5 6.9844 9.6094 10.5 20.812 10.5 33.609 0 11.391-2.4844 22.219-7.5 32.391-4.8281 9.9844-14.203 21.422-28.219 34.219l-39.609 36.609zm-15.281 292.69c-9.1875-10.828-22.5-18-39.891-21.609l43.5-46.781v-37.219h-151.78v45.891h82.781l-37.5 40.5v37.5h24.891c21.422 0 32.109 6.7969 32.109 20.391 0 7.0312-3 12.422-9 16.219s-14.109 5.7188-24.281 5.7188c-10.031 0-20.203-1.5-30.609-4.5-10.219-3-19.406-7.3125-27.609-12.938l-21.609 44.719c10.594 6.6094 23.109 11.719 37.5 15.281 14.625 3.6094 29.297 5.4375 44.109 5.4375 20.203 0 37.125-3.2344 50.719-9.6094 13.781-6.6094 24-15.188 30.609-25.828 6.7969-10.594 10.172-22.078 10.172-34.5 0-15.188-4.6875-28.078-14.109-38.672zm132.56-45.609h700.03v99.984h-700.03zm700.03-350.02h-700.03v100.03h700.03z"
      />
    </PlayerIcon>
  );
}

/** Horizontal bar — minify chrome toggle. */
export function IconMinifyBar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <rect x="3.5" y="9.25" width="17" height="5.5" rx="2.75" />
    </svg>
  );
}

/** images/menu-bar-icons2.svg — hamburger / options menu. */
export function IconMenu({ className }: IconProps) {
  return (
    <PlayerIcon className={className} viewBox="0 0 1600 1600">
      <path d="M0 700h440v200H0z" />
      <path d="M579 700h441v200H579z" />
      <path d="M1159 700h441v200h-441z" />
    </PlayerIcon>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <PlayerIcon className={className} viewBox="0 0 24 24">
      <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </PlayerIcon>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <PlayerIcon className={className} viewBox="0 0 24 24">
      <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </PlayerIcon>
  );
}

/** Trash can — stroke paths tinted via currentColor (playlist home remove, etc.). */
export function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M6 7h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 7Z" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

/** Circled info — playlist home actions. */
export function IconInfo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle className="playlist-home-action-icon-fill" cx="12" cy="8" r="1" />
    </svg>
  );
}

/** Share nodes — playlist home actions. */
export function IconShare({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="19" r="2.25" />
      <path d="M8.2 10.7 15.8 6.3" />
      <path d="M8.2 13.3 15.8 17.7" />
    </svg>
  );
}

/** Plus — playlist home actions. */
export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </svg>
  );
}

/** Calendar — playlist home metadata. */
export function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 10h16" />
    </svg>
  );
}

/** Clock — playlist length column header. */
export function IconClock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  );
}
