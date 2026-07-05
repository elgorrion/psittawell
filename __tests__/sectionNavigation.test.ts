import { psittawelContentPack } from '../content/psittawel';
import { getSectionFooterState } from '../lib/sectionNavigation';

describe('getSectionFooterState', () => {
  const sections = psittawelContentPack.sections;

  it('targets the next section from the first section and hides Previous', () => {
    expect(getSectionFooterState(sections, sections[0].id, 'draft')).toEqual({
      previousSectionId: null,
      forwardAction: { kind: 'next', sectionId: sections[1].id },
    });
  });

  it('targets both adjacent sections from a middle section without changing by status', () => {
    expect(getSectionFooterState(sections, sections[3].id, 'completed')).toEqual({
      previousSectionId: sections[2].id,
      forwardAction: { kind: 'next', sectionId: sections[4].id },
    });
  });

  it('turns the final draft section forward action into Finish', () => {
    expect(getSectionFooterState(sections, sections[sections.length - 1].id, 'draft')).toEqual({
      previousSectionId: sections[sections.length - 2].id,
      forwardAction: { kind: 'finish' },
    });
  });

  it('hides the final completed section forward action', () => {
    expect(
      getSectionFooterState(sections, sections[sections.length - 1].id, 'completed'),
    ).toEqual({
      previousSectionId: sections[sections.length - 2].id,
      forwardAction: { kind: 'hidden' },
    });
  });

  it('returns no actions for an unknown section id', () => {
    expect(getSectionFooterState(sections, 'missing_section', 'draft')).toEqual({
      previousSectionId: null,
      forwardAction: { kind: 'hidden' },
    });
  });
});
