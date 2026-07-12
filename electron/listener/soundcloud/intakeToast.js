/**
 * Keep in sync with shared/providers/soundcloud/intakeToast.ts
 */
function buildSoundcloudIntakeToastMessage(discarded) {
  const notes = discarded?.notes ?? [];
  if (notes.length === 0) return null;
  return `Added track — removed from pasted URL: ${notes.join('; ')}.`;
}

module.exports = { buildSoundcloudIntakeToastMessage };
