import {
  getSectionLegendFlags,
  getSectionLegendGuidance,
} from '../components/SectionLegend';
import { psittawelContentPack } from '../content/psittawel';

describe('section legend', () => {
  it('derives only the markers used in each section', () => {
    const [general, physicalHealth] = psittawelContentPack.sections;

    expect(getSectionLegendFlags(general)).toEqual(['dont_know']);
    expect(getSectionLegendFlags(physicalHealth)).toEqual([
      'dont_know',
      'vet_concern',
      'vet_urgent',
      'behaviour_urgent',
    ]);
  });

  it('keeps the professional guidance sentence from the instrument interpretation', () => {
    const [general] = psittawelContentPack.sections;
    const guidance = getSectionLegendGuidance(general.interpretation);

    expect(guidance).toMatch(/^An avian veterinarian/);
    expect(guidance).toMatch(/improve your parrot's welfare\.$/);
    expect(guidance).not.toContain('How to interpret your answers');
  });
});
