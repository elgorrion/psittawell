import type { Assessment } from './assessments';
import type { AssessmentResults, ResultIndicator } from './results';
import type { OptionFlag, WelfareLevel } from '../content/schema';

export type ParrotTimelineDate = {
  assessmentId: number;
  date: string;
};

export type ParrotTimelineEntry =
  | {
      assessmentId: number;
      state: 'welfare_level';
      optionLabel: string;
      welfareLevel: WelfareLevel;
      flags: OptionFlag[];
    }
  | {
      assessmentId: number;
      state: 'flag';
      optionLabel: string;
      welfareLevel: WelfareLevel | null;
      flags: OptionFlag[];
    }
  | {
      assessmentId: number;
      state: 'not_flagged';
      optionLabel?: string;
    }
  | {
      assessmentId: number;
      state: 'not_answered';
    };

export type ParrotTimelineIndicator = {
  indicatorId: string;
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionPrompt: string;
  rowLabel?: string;
  entries: ParrotTimelineEntry[];
};

export type ParrotTimeline = {
  dates: ParrotTimelineDate[];
  indicators: ParrotTimelineIndicator[];
};

export type ResultsByAssessmentId = Readonly<Record<number, AssessmentResults | undefined>>;

const timelineWelfareLevels = new Set<WelfareLevel>([
  'moderate',
  'elevated_risk',
  'high_risk',
]);
const timelineFlagSet = new Set<OptionFlag>([
  'vet_urgent',
  'behaviour_urgent',
  'vet_concern',
  'dont_know',
  'context_dependent',
]);

export function buildParrotTimeline(
  assessmentsForParrot: readonly Assessment[],
  resultsByAssessmentId: ResultsByAssessmentId,
): ParrotTimeline {
  const completedAssessments = assessmentsForParrot.filter(
    (assessment) => assessment.status === 'completed',
  );
  const dates = completedAssessments.map((assessment) => ({
    assessmentId: assessment.id,
    date: assessment.completedAt ?? assessment.startedAt,
  }));

  if (completedAssessments.length < 2) {
    return {
      dates,
      indicators: [],
    };
  }

  const entriesByAssessment = new Map<number, Map<string, ResultIndicator[]>>();
  const questionKeysByAssessment = new Map<number, Set<string>>();
  const concernIndicators = new Map<string, ResultIndicator>();

  for (const assessment of completedAssessments) {
    const results = resultsByAssessmentId[assessment.id];
    const entriesByIndicator = new Map<string, ResultIndicator[]>();
    const questionKeys = new Set<string>();

    for (const indicator of results?.indicators ?? []) {
      const entries = entriesByIndicator.get(indicator.indicatorId) ?? [];
      entries.push(indicator);
      entriesByIndicator.set(indicator.indicatorId, entries);
      questionKeys.add(indicator.questionId);
    }

    entriesByAssessment.set(assessment.id, entriesByIndicator);
    questionKeysByAssessment.set(assessment.id, questionKeys);

    for (const entries of entriesByIndicator.values()) {
      const concernEntry = chooseConcernEntry(entries);

      if (concernEntry && !concernIndicators.has(concernEntry.indicatorId)) {
        concernIndicators.set(concernEntry.indicatorId, concernEntry);
      }
    }
  }

  return {
    dates,
    indicators: [...concernIndicators.values()].map((indicator) => ({
      indicatorId: indicator.indicatorId,
      sectionId: indicator.sectionId,
      sectionTitle: indicator.sectionTitle,
      questionId: indicator.questionId,
      questionPrompt: indicator.questionPrompt,
      rowLabel: indicator.rowLabel,
      entries: completedAssessments.map((assessment) =>
        buildTimelineEntry({
          assessment,
          indicator,
          entriesByAssessment,
          questionKeysByAssessment,
        }),
      ),
    })),
  };
}

function buildTimelineEntry({
  assessment,
  indicator,
  entriesByAssessment,
  questionKeysByAssessment,
}: {
  assessment: Assessment;
  indicator: ResultIndicator;
  entriesByAssessment: ReadonlyMap<number, ReadonlyMap<string, readonly ResultIndicator[]>>;
  questionKeysByAssessment: ReadonlyMap<number, ReadonlySet<string>>;
}): ParrotTimelineEntry {
  const entries = entriesByAssessment.get(assessment.id)?.get(indicator.indicatorId) ?? [];
  const current = chooseTimelineEntry(entries);

  if (!current) {
    return questionKeysByAssessment.get(assessment.id)?.has(indicator.questionId)
      ? {
          assessmentId: assessment.id,
          state: 'not_flagged',
        }
      : {
          assessmentId: assessment.id,
          state: 'not_answered',
        };
  }

  const concernFlags = getTimelineFlags(current);

  if (concernFlags.length > 0) {
    return {
      assessmentId: assessment.id,
      state: 'flag',
      optionLabel: current.optionLabel,
      welfareLevel: current.welfareLevel,
      flags: concernFlags,
    };
  }

  if (current.welfareLevel !== null) {
    return {
      assessmentId: assessment.id,
      state: 'welfare_level',
      optionLabel: current.optionLabel,
      welfareLevel: current.welfareLevel,
      flags: [],
    };
  }

  return {
    assessmentId: assessment.id,
    state: 'not_flagged',
    optionLabel: current.optionLabel,
  };
}

function chooseConcernEntry(entries: readonly ResultIndicator[]): ResultIndicator | null {
  return entries.find(isConcernIndicator) ?? null;
}

function chooseTimelineEntry(entries: readonly ResultIndicator[]): ResultIndicator | null {
  return entries.find((entry) => getTimelineFlags(entry).length > 0)
    ?? entries.find((entry) => entry.welfareLevel !== null)
    ?? entries[0]
    ?? null;
}

function isConcernIndicator(indicator: ResultIndicator): boolean {
  return (
    getTimelineFlags(indicator).length > 0 ||
    (indicator.welfareLevel !== null && timelineWelfareLevels.has(indicator.welfareLevel))
  );
}

function getTimelineFlags(indicator: ResultIndicator): OptionFlag[] {
  return indicator.flags.filter((flag) => timelineFlagSet.has(flag));
}
