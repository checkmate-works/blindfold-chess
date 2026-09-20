import type { AdKind, AdSlot } from '@/lib/ads/registry';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import type { CreativeFormInitial } from '../_lib/use-common-creative-state';
import { NativeCardCreativeForm } from './NativeCardCreativeForm';
import { NativeThumbCreativeForm } from './NativeThumbCreativeForm';
import { NativeTileCreativeForm } from './NativeTileCreativeForm';

type Props = {
  kind: AdKind;
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  initial: CreativeFormInitial;
  labels: AdCreativeFormLabels;
};

/**
 * The authoring form for a slot's kind, for both the create and the edit
 * page.
 *
 * The slot decides the shape, so it decides the form. A slot accepts exactly
 * one kind and a creative cannot be moved between slots, so there is never a
 * form to switch mid-edit.
 *
 * Exhaustive over `AdKind` and in one place for a specific reason: the two
 * pages used to pick the form with `kind === 'native_tile' ? tile : card`,
 * which is total for two kinds and silently wrong for three — `native_thumb`
 * would have been handed the card form, and the admin would have been asked
 * for an author image the shape cannot render. A `switch` with no `default`
 * makes the next kind a compile error in one file instead of two runtime
 * surprises, which is the gap the ad registry's own TSDoc warned about.
 */
export function CreativeFormForKind({ kind, mode, slot, creativeId, initial, labels }: Props) {
  const props = { mode, slot, creativeId, initial, labels } as const;

  switch (kind) {
    case 'native_card':
      return <NativeCardCreativeForm {...props} />;
    case 'native_tile':
      return <NativeTileCreativeForm {...props} />;
    case 'native_thumb':
      return <NativeThumbCreativeForm {...props} />;
  }
}
