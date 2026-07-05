import {
  getWelfareGradientAccessibilityLabel,
  legendFlagOrder,
  getSectionLegendDirectionRows,
  getSectionLegendFlags,
  getSectionLegendGuidance,
} from '../components/SectionLegend';
import { psittawelContentPack } from '../content/psittawel';
import type { OptionFlag, Question, Section } from '../content/schema';
import { observeFlagOrder, urgentFlagOrder } from '../lib/results';

describe('section legend', () => {
  it('derives only the markers used in each section', () => {
    const [
      general,
      physicalHealth,
      housing,
      enrichment,
      nutrition,
      social,
      human,
      maladaptive,
    ] = psittawelContentPack.sections;

    expect(getSectionLegendFlags(general)).toEqual(['dont_know']);
    expect(getSectionLegendFlags(physicalHealth)).toEqual([
      'dont_know',
      'vet_concern',
      'vet_urgent',
      'behaviour_urgent',
    ]);
    expect(getSectionLegendFlags(housing)).toEqual(['dont_know']);
    expect(getSectionLegendFlags(enrichment)).toEqual([
      'dont_know',
      'vet_urgent',
      'context_dependent',
    ]);
    expect(getSectionLegendFlags(nutrition)).toEqual(['dont_know', 'vet_concern']);
    expect(getSectionLegendFlags(social)).toEqual(['behaviour_urgent', 'context_dependent']);
    expect(getSectionLegendFlags(human)).toEqual([
      'dont_know',
      'behaviour_urgent',
      'context_dependent',
    ]);
    expect(getSectionLegendFlags(maladaptive)).toEqual([
      'dont_know',
      'behaviour_urgent',
      'context_dependent',
    ]);
  });

  it('uses section-specific direction rows', () => {
    const [, physicalHealth, housing, , , social, human] = psittawelContentPack.sections;

    expect(getSectionLegendDirectionRows(housing)).toEqual([
      {
        id: 'welfare',
        good: '↑ likelihood for good welfare',
        risk: '↑ risk for compromised welfare',
      },
    ]);
    expect(getSectionLegendDirectionRows(physicalHealth)).toEqual([
      {
        id: 'parrot',
        good: 'Indicator of good welfare',
        risk: 'Indicator of compromised welfare',
      },
    ]);
    expect(getSectionLegendDirectionRows(social)).toEqual([
      {
        id: 'parrot',
        good: 'Indicator of good welfare',
        risk: 'Indicator of compromised welfare',
      },
    ]);
    expect(getSectionLegendDirectionRows(human)).toEqual([
      {
        id: 'hand',
        good: '↑ likelihood to build an appropriate positive relationship',
        risk: '↑ risk for inappropriate or problematic relationship',
      },
      {
        id: 'parrot',
        good: 'Indicator of good welfare',
        risk: 'Indicator of compromised welfare',
      },
    ]);
  });

  it('includes grid row flags in the section marker scan', () => {
    const nutrition = psittawelContentPack.sections[4];
    const bathingOnly = {
      ...nutrition,
      questions: [nutrition.questions[7]],
    };

    expect(getSectionLegendFlags(bathingOnly)).toEqual(['dont_know']);
  });

  it('keeps every shipped content flag covered by legend and results orders', () => {
    const usedFlags = [...collectUsedFlags(psittawelContentPack.sections)];
    const resultsFlagOrder = new Set<OptionFlag>([
      ...urgentFlagOrder,
      ...observeFlagOrder,
    ]);

    expect(usedFlags.length).toBeGreaterThan(0);

    for (const flag of usedFlags) {
      expect(legendFlagOrder).toContain(flag);
      expect(resultsFlagOrder.has(flag)).toBe(true);
    }
  });

  it('enumerates welfare gradient levels in the group accessibility label', () => {
    expect(getWelfareGradientAccessibilityLabel()).toBe(
      'Five-level welfare gradient from optimal to high risk: Optimal, Good, Moderate, Elevated, High risk',
    );
  });

  it('keeps the professional guidance sentence from the instrument interpretation', () => {
    const [general] = psittawelContentPack.sections;
    const guidance = getSectionLegendGuidance(general.interpretation);

    expect(guidance).toMatch(/^An avian veterinarian/);
    expect(guidance).toMatch(/improve your parrot's welfare\.$/);
    expect(guidance).not.toContain('How to interpret your answers');
  });

  it('extracts stable guidance suffixes from every shipped section interpretation', () => {
    for (const section of psittawelContentPack.sections) {
      const interpretation = section.interpretation.trim();
      const guidance = getSectionLegendGuidance(section.interpretation);
      const guidanceStart = interpretation.length - guidance.length;
      const prefix = interpretation.slice(0, guidanceStart);

      expect(guidance).toEqual(expect.stringMatching(/\S/));
      expect(interpretation.endsWith(guidance)).toBe(true);
      expect(guidance).not.toMatch(/^(?:g|e)\.,/i);
      expect(prefix).not.toMatch(/\b(?:e|i)\.\s*$/i);
    }
  });
});

function collectUsedFlags(sections: readonly Section[]): Set<OptionFlag> {
  const usedFlags = new Set<OptionFlag>();

  for (const section of sections) {
    for (const question of section.questions) {
      collectQuestionFlags(question, usedFlags);
    }
  }

  return usedFlags;
}

function collectQuestionFlags(question: Question, usedFlags: Set<OptionFlag>): void {
  addFlags(question.flags, usedFlags);

  if (question.type === 'free_text') {
    return;
  }

  if (question.type === 'matrix') {
    for (const rowGroup of question.row_groups) {
      for (const column of rowGroup.columns) {
        addFlags(column.flags, usedFlags);
      }
    }

    return;
  }

  if (question.type === 'grid') {
    for (const row of question.rows) {
      addFlags(row.flags, usedFlags);
    }

    for (const columnGroup of question.column_groups) {
      for (const column of columnGroup.columns) {
        addFlags(column.flags, usedFlags);
      }
    }

    return;
  }

  for (const option of question.options) {
    addFlags(option.flags, usedFlags);
  }
}

function addFlags(flags: readonly OptionFlag[] | undefined, usedFlags: Set<OptionFlag>): void {
  for (const flag of flags ?? []) {
    usedFlags.add(flag);
  }
}
