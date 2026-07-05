import type { AssessmentStatus } from './assessments';
import type { Section } from '../content/schema';

export type SectionForwardAction =
  | { kind: 'next'; sectionId: string }
  | { kind: 'finish' }
  | { kind: 'hidden' };

export type SectionFooterState = {
  previousSectionId: string | null;
  forwardAction: SectionForwardAction;
};

export function getSectionFooterState(
  sections: readonly Section[],
  sectionId: string,
  assessmentStatus: AssessmentStatus,
): SectionFooterState {
  const sectionIndex = sections.findIndex((section) => section.id === sectionId);

  if (sectionIndex < 0) {
    return {
      previousSectionId: null,
      forwardAction: { kind: 'hidden' },
    };
  }

  const previousSection = sections[sectionIndex - 1] ?? null;
  const nextSection = sections[sectionIndex + 1] ?? null;

  if (nextSection) {
    return {
      previousSectionId: previousSection?.id ?? null,
      forwardAction: { kind: 'next', sectionId: nextSection.id },
    };
  }

  return {
    previousSectionId: previousSection?.id ?? null,
    forwardAction: assessmentStatus === 'draft' ? { kind: 'finish' } : { kind: 'hidden' },
  };
}
