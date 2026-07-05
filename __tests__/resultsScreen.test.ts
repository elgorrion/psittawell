import { flagGlyphs } from '../components/questions/Badges';
import { getObserveResultsTitle } from '../app/assessment/[id]/results';

describe('assessment results screen helpers', () => {
  it('composes the observe panel title from the shared dont_know glyph', () => {
    expect(getObserveResultsTitle()).toBe(`${flagGlyphs.dont_know} Learn more and observe`);
  });
});

