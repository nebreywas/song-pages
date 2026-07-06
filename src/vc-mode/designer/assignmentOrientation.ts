import { isHostContentKind, VC_CONTENT_LABELS, type VcCellContent } from '@shared/vcModeTypes';

export type AssignmentOrientationParts = {
  before: string;
  contentLabel: string;
  after: string;
};

/** Short intro copy at the top of Primary/Secondary tab panels in the region popover. */
export function getAssignmentOrientationParts(content: VcCellContent): AssignmentOrientationParts | null {
  const label = VC_CONTENT_LABELS[content];
  if (!label || content === '') return null;

  const contentLabel = label.toLowerCase();

  if (isHostContentKind(content)) {
    return {
      before: 'Set how the selected ',
      contentLabel,
      after: ' will display…',
    };
  }

  return {
    before: 'Set how Song Pages ',
    contentLabel: `${contentLabel} content`,
    after: ' will display…',
  };
}
