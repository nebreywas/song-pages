/** Minimum base-area size along a divider axis (normalized 0–1). */
export const VC_MIN_BASE_AREA = 0.1;

/** Minimum float width/height as a fraction of the surface (normalized 0–1). */
export const VC_MIN_FLOAT = 0.05;

export const VC_MAX_BASE_AREAS = 4;
export const VC_MAX_FLOATS = 4;

/** Default float size when created (25% × 25%). */
export const VC_DEFAULT_FLOAT_SIZE = 0.25;

/** Inset from bottom-right when creating a float. */
export const VC_DEFAULT_FLOAT_INSET = 0.04;

export const VC_SAFE_TEMPLATE_ID = 'single-screen' as const;
