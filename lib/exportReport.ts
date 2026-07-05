import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { t } from './i18n';

export type ShareResultsReportOutcome = 'shared' | 'unavailable';

type ShareResultsReportOptions = {
  now?: Date;
  parrotName?: string;
};

export async function isResultsReportSharingAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  return Sharing.isAvailableAsync();
}

export async function shareResultsReport(
  html: string,
  options: ShareResultsReportOptions = {},
): Promise<ShareResultsReportOutcome> {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }

  if (!(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }

  const { uri } = await Print.printToFileAsync({ html });
  const reportFile = new File(
    Paths.cache,
    buildResultsReportFilename(options.parrotName ?? '', options.now ?? new Date()),
  );
  await new File(uri).move(reportFile, { overwrite: true });

  await Sharing.shareAsync(reportFile.uri, {
    UTI: 'com.adobe.pdf',
    dialogTitle: t('assessment.report.shareDialogTitle'),
    mimeType: 'application/pdf',
  });

  return 'shared';
}

export function buildResultsReportFilename(parrotName: string, date: Date): string {
  const sanitizedName = sanitizeReportFilenameSegment(parrotName);
  const namePart = sanitizedName.length > 0 ? sanitizedName : 'report';

  return `PsittaWell-${namePart}-${formatFilenameDate(date)}.pdf`;
}

export function sanitizeReportFilenameSegment(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
}

function formatFilenameDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
