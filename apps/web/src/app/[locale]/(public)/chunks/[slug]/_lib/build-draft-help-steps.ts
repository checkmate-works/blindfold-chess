import type { HelpStep } from '@/app/[locale]/_components';

/** The subset of the next-intl translator the builder needs. */
type Translator = (key: string) => string;

/**
 * Help-tour steps for the draft state — mirrors the home / practice
 * convention (HelpTourButton + data-tour-id on the target elements).
 * Drafts get a brief walkthrough explaining the "edit suggestions"
 * workflow that's unique to this lifecycle; published chunks render
 * no help button since the page is then just a standard catalog entry.
 */
export function buildDraftHelpSteps(
  tEditRequests: Translator,
  showEditRequestCallout: boolean
): HelpStep[] {
  return [
    {
      targetId: 'chunk-draft-badge',
      title: tEditRequests('help.badge.title'),
      description: tEditRequests('help.badge.description'),
      side: 'bottom',
      align: 'center',
    },
    // The second step highlights the callout's CTA, so it only makes sense
    // when the callout actually renders. Skip it when the callout is
    // suppressed (owner viewing an empty queue) so the tour does not point
    // at a missing element.
    ...(showEditRequestCallout
      ? [
          {
            targetId: 'chunk-edit-requests-link',
            title: tEditRequests('help.editRequests.title'),
            description: tEditRequests('help.editRequests.description'),
            side: 'bottom' as const,
            align: 'end' as const,
          },
        ]
      : []),
  ];
}
