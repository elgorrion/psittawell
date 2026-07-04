import type { AssessmentResults } from '../lib/results';
import { buildResultsReportHtml } from '../lib/resultsReport';

describe('buildResultsReportHtml', () => {
  it('renders the welfare overview contents for sharing', () => {
    const html = buildResultsReportHtml({
      generatedAtLabel: '4 Jul 2026, 18:30',
      parrotName: 'Kiwi',
      results: fixtureResults,
    });

    expect(html).toContain('Welfare overview report for Kiwi');
    expect(html).toContain('Physical health');
    expect(html).toContain('Yes, not diagnosed');
    expect(html).toContain('Housing &amp; physical activity');
    expect(html).toContain('Less than weekly');
    expect(html).toContain('Provision of enrichment &amp; exploration');
    expect(html).toContain('I don&#39;t know');
    expect(html).toContain(
      'For any concern, consult an avian vet or a certified parrot behaviour consultant.',
    );
  });

  it('does not render aggregate judgement language', () => {
    const html = buildResultsReportHtml({
      generatedAtLabel: '4 Jul 2026, 18:30',
      parrotName: 'Kiwi',
      results: fixtureResults,
    });

    expect(html).not.toMatch(
      /\b(score|scored|total|percentage|percent|grade|graded|points|ranking|ranked|overall|verdict)\b/i,
    );
  });

  it('escapes user-derived and content-derived labels before interpolating HTML', () => {
    const html = buildResultsReportHtml({
      generatedAtLabel: '4 Jul 2026, 18:30',
      parrotName: 'Polly <script>alert("x")</script> & friend',
      results: {
        urgent: [],
        attention: [
          {
            sectionId: 's_escape',
            sectionTitle: 'Section & detail',
            items: [
              {
                questionId: 'q_escape',
                questionPrompt: 'Prompt with <angle> & ampersand',
                rowLabel: 'Row "quoted"',
                optionLabel: 'Free text <script>alert("bird")</script> & note',
                welfareLevel: 'moderate',
              },
            ],
          },
        ],
        observe: [],
        sectionsReviewed: [{ sectionId: 's_escape', sectionTitle: 'Section & detail' }],
      },
    });

    expect(html).toContain(
      'Polly &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; friend',
    );
    expect(html).toContain('Prompt with &lt;angle&gt; &amp; ampersand');
    expect(html).toContain('Row &quot;quoted&quot;');
    expect(html).toContain(
      'Free text &lt;script&gt;alert(&quot;bird&quot;)&lt;/script&gt; &amp; note',
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('Free text <script>');
  });

  it('renders an empty overview without crashing', () => {
    const html = buildResultsReportHtml({
      generatedAtLabel: '4 Jul 2026, 18:30',
      parrotName: '',
      results: {
        urgent: [],
        attention: [],
        observe: [],
        sectionsReviewed: [],
      },
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('This is a general overview of the answers');
    expect(html).toContain(
      'For any concern, consult an avian vet or a certified parrot behaviour consultant.',
    );
  });
});

const fixtureResults: AssessmentResults = {
  urgent: [
    {
      flags: ['vet_urgent', 'behaviour_urgent'],
      optionLabel: 'Yes, not diagnosed',
      questionId: 'q_health_signs::row_swelling',
      questionPrompt: 'Does your parrot show these signs?',
      rowLabel: 'Swelling',
      sectionId: 's_physical_health',
      sectionTitle: 'Physical health',
    },
  ],
  attention: [
    {
      items: [
        {
          optionLabel: 'Less than weekly',
          questionId: 'q_flight',
          questionPrompt: 'How often can your parrot fly?',
          rowLabel: 'Flight opportunity',
          welfareLevel: 'high_risk',
        },
      ],
      sectionId: 's_housing',
      sectionTitle: 'Housing & physical activity',
    },
  ],
  observe: [
    {
      flag: 'dont_know',
      optionLabel: "I don't know",
      questionId: 'q_enrichment',
      questionPrompt: 'Can you identify this enrichment?',
      rowLabel: 'Foraging',
      sectionId: 's_enrichment',
      sectionTitle: 'Provision of enrichment & exploration',
    },
  ],
  sectionsReviewed: [
    { sectionId: 's_physical_health', sectionTitle: 'Physical health' },
    { sectionId: 's_housing', sectionTitle: 'Housing & physical activity' },
    {
      sectionId: 's_enrichment',
      sectionTitle: 'Provision of enrichment & exploration',
    },
  ],
};
