import {
  getSectionLegendDirectionRows,
  getSectionLegendFlags,
  getSectionLegendGuidance,
} from '../components/SectionLegend';
import { psittawelContentPack } from '../content/psittawel';

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

  it('keeps the professional guidance sentence from the instrument interpretation', () => {
    const [general] = psittawelContentPack.sections;
    const guidance = getSectionLegendGuidance(general.interpretation);

    expect(guidance).toMatch(/^An avian veterinarian/);
    expect(guidance).toMatch(/improve your parrot's welfare\.$/);
    expect(guidance).not.toContain('How to interpret your answers');
  });
});
