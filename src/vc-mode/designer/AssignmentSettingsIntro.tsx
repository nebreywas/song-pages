import type { VcCellContent } from '@shared/vcModeTypes';

import { getAssignmentOrientationParts } from './assignmentOrientation';

type AssignmentSettingsIntroProps = {
  content: VcCellContent;
};

/** Plain-language orientation above assignment controls — not a section heading. */
export function AssignmentSettingsIntro({ content }: AssignmentSettingsIntroProps) {
  const parts = getAssignmentOrientationParts(content);
  if (!parts) return null;

  return (
    <div className="vc-assignment-settings-intro">
      <p className="vc-assignment-orientation">
        {parts.before}
        <span className="vc-assignment-content-type">{parts.contentLabel}</span>
        {parts.after}
      </p>
    </div>
  );
}
