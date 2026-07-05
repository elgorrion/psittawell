import { t } from './i18n';

export function getCompleteConfirmMessage(unansweredCount: number) {
  if (unansweredCount <= 0) {
    return t('assessment.overview.confirmMessage');
  }

  return t(
    unansweredCount === 1
      ? 'assessment.overview.confirmMessageWithUnansweredOne'
      : 'assessment.overview.confirmMessageWithUnansweredOther',
    { count: unansweredCount },
  );
}
