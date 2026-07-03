/**
 * Stock VC division templates as constrained split trees.
 * Area numbers are stable identities; divider keys are named parameters.
 */

import { VC_SAFE_TEMPLATE_ID } from './constants';

export type VcTemplateId =
  | 'single-screen'
  | 'double-vertical'
  | 'double-horizontal'
  | 'triple-striped-vertical'
  | 'triple-striped-horizontal'
  | 'triple-split-bottom'
  | 'triple-split-top'
  | 'triple-split-right'
  | 'triple-split-left'
  | 'quad'
  | 'quad-split-top'
  | 'quad-split-middle'
  | 'quad-split-bottom';

/** Leaf or split node. Split children share one axis; dividerKeys[i] separates children[i] and children[i+1]. */
export type VcSplitNode =
  | { type: 'area'; areaNumber: number }
  | {
      type: 'split';
      axis: 'horizontal' | 'vertical';
      /** Cumulative positions along the axis (0–1), one per internal divider. */
      dividerKeys: string[];
      defaults: number[];
      children: VcSplitNode[];
    };

export type VcTemplateDefinition = {
  id: VcTemplateId;
  label: string;
  areaCount: number;
  root: VcSplitNode;
};

function area(n: number): VcSplitNode {
  return { type: 'area', areaNumber: n };
}

function split(
  axis: 'horizontal' | 'vertical',
  dividerKeys: string[],
  defaults: number[],
  children: VcSplitNode[],
): VcSplitNode {
  return { type: 'split', axis, dividerKeys, defaults, children };
}

export const VC_TEMPLATES: VcTemplateDefinition[] = [
  {
    id: 'single-screen',
    label: 'Single Screen',
    areaCount: 1,
    root: area(1),
  },
  {
    id: 'double-vertical',
    label: 'Double Vertical',
    areaCount: 2,
    root: split('vertical', ['primaryVertical'], [0.5], [area(1), area(2)]),
  },
  {
    id: 'double-horizontal',
    label: 'Double Horizontal',
    areaCount: 2,
    root: split('horizontal', ['primaryHorizontal'], [0.5], [area(1), area(2)]),
  },
  {
    id: 'triple-striped-vertical',
    label: 'Triple Striped Vertical',
    areaCount: 3,
    root: split('vertical', ['primaryVertical', 'secondaryVertical'], [1 / 3, 2 / 3], [
      area(1),
      area(2),
      area(3),
    ]),
  },
  {
    id: 'triple-striped-horizontal',
    label: 'Triple Striped Horizontal',
    areaCount: 3,
    root: split('horizontal', ['primaryHorizontal', 'secondaryHorizontal'], [1 / 3, 2 / 3], [
      area(1),
      area(2),
      area(3),
    ]),
  },
  {
    id: 'triple-split-bottom',
    label: 'Triple Split Bottom',
    areaCount: 3,
    root: split('horizontal', ['primaryHorizontal'], [0.7], [
      area(1),
      split('vertical', ['lowerVertical'], [0.5], [area(2), area(3)]),
    ]),
  },
  {
    id: 'triple-split-top',
    label: 'Triple Split Top',
    areaCount: 3,
    root: split('horizontal', ['primaryHorizontal'], [0.3], [
      split('vertical', ['upperVertical'], [0.5], [area(1), area(2)]),
      area(3),
    ]),
  },
  {
    id: 'triple-split-right',
    label: 'Triple Split Right',
    areaCount: 3,
    root: split('vertical', ['primaryVertical'], [0.7], [
      area(1),
      split('horizontal', ['rightHorizontal'], [0.5], [area(2), area(3)]),
    ]),
  },
  {
    id: 'triple-split-left',
    label: 'Triple Split Left',
    areaCount: 3,
    root: split('vertical', ['primaryVertical'], [0.3], [
      split('horizontal', ['leftHorizontal'], [0.5], [area(1), area(2)]),
      area(3),
    ]),
  },
  {
    id: 'quad',
    label: 'Quad',
    areaCount: 4,
    // Shared divider keys so one vertical and one horizontal control the whole grid.
    root: split('horizontal', ['primaryHorizontal'], [0.5], [
      split('vertical', ['primaryVertical'], [0.5], [area(1), area(2)]),
      split('vertical', ['primaryVertical'], [0.5], [area(3), area(4)]),
    ]),
  },
  {
    id: 'quad-split-top',
    label: 'Quad Split Top',
    areaCount: 4,
    root: split('horizontal', ['primaryHorizontal', 'secondaryHorizontal'], [0.34, 0.67], [
      split('vertical', ['primaryVertical'], [0.5], [area(1), area(2)]),
      area(3),
      area(4),
    ]),
  },
  {
    id: 'quad-split-middle',
    label: 'Quad Split Middle',
    areaCount: 4,
    root: split('horizontal', ['primaryHorizontal', 'secondaryHorizontal'], [0.34, 0.67], [
      area(1),
      split('vertical', ['primaryVertical'], [0.5], [area(2), area(3)]),
      area(4),
    ]),
  },
  {
    id: 'quad-split-bottom',
    label: 'Quad Split Bottom',
    areaCount: 4,
    root: split('horizontal', ['primaryHorizontal', 'secondaryHorizontal'], [0.34, 0.67], [
      area(1),
      area(2),
      split('vertical', ['primaryVertical'], [0.5], [area(3), area(4)]),
    ]),
  },
];

const TEMPLATE_BY_ID = new Map(VC_TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): VcTemplateDefinition {
  return TEMPLATE_BY_ID.get(id as VcTemplateId) ?? TEMPLATE_BY_ID.get(VC_SAFE_TEMPLATE_ID)!;
}

export function isVcTemplateId(value: unknown): value is VcTemplateId {
  return typeof value === 'string' && TEMPLATE_BY_ID.has(value as VcTemplateId);
}

/** Default divider map for a template (stock proportions). */
export function defaultDividersForTemplate(id: VcTemplateId | string): Record<string, number> {
  const template = getTemplate(id);
  const dividers: Record<string, number> = {};

  const walk = (node: VcSplitNode) => {
    if (node.type === 'area') return;
    node.dividerKeys.forEach((key, index) => {
      if (dividers[key] == null) dividers[key] = node.defaults[index] ?? 0.5;
    });
    node.children.forEach(walk);
  };

  walk(template.root);
  return dividers;
}
