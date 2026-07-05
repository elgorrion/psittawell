import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { t } from './i18n';

export type SharePdfReportOutcome = 'shared' | 'unavailable';
export type ShareResultsReportOutcome = SharePdfReportOutcome;

const shareCancellationCodes = new Set([
  'ACTION_DISMISSED',
  'E_CANCELED',
  'E_CANCELLED',
  'ERR_CANCELED',
  'ERR_CANCELLED',
  'ERR_USER_CANCELED',
  'ERR_USER_CANCELLED',
  'USER_CANCELED',
  'USER_CANCELLED',
]);
const shareCancellationPattern = /cancel|dismiss/i;

type ShareResultsReportOptions = {
  now?: Date;
  parrotName?: string;
};

type SharePdfReportOptions = {
  dialogTitle: string;
  filename: string;
};

export async function isResultsReportSharingAvailable(): Promise<boolean> {
  return isPdfReportSharingAvailable();
}

export async function isPdfReportSharingAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  return Sharing.isAvailableAsync();
}

export async function shareResultsReport(
  html: string,
  options: ShareResultsReportOptions = {},
): Promise<ShareResultsReportOutcome> {
  return sharePdfReport(html, {
    dialogTitle: t('assessment.report.shareDialogTitle'),
    filename: buildResultsReportFilename(options.parrotName ?? '', options.now ?? new Date()),
  });
}

const a4PageSize = { width: 595, height: 842 };

export async function sharePdfReport(
  html: string,
  options: SharePdfReportOptions,
): Promise<SharePdfReportOutcome> {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }

  if (!(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }

  const { uri } = await Print.printToFileAsync({
    html,
    width: a4PageSize.width,
    height: a4PageSize.height,
  });
  const reportFile = new File(Paths.cache, options.filename);
  await new File(uri).move(reportFile, { overwrite: true });

  await Sharing.shareAsync(reportFile.uri, {
    UTI: 'com.adobe.pdf',
    dialogTitle: options.dialogTitle,
    mimeType: 'application/pdf',
  });

  return 'shared';
}

export function isShareCancellation(error: unknown): boolean {
  const code = getErrorStringProperty(error, 'code');

  if (code !== null) {
    const normalizedCode = code.toUpperCase();

    return shareCancellationCodes.has(normalizedCode) || shareCancellationPattern.test(code);
  }

  const message =
    error instanceof Error
      ? error.message
      : getErrorStringProperty(error, 'message') ?? String(error ?? '');

  return shareCancellationPattern.test(message);
}

export function buildResultsReportFilename(parrotName: string, date: Date): string {
  const sanitizedName = sanitizeReportFilenameSegment(parrotName);
  const namePart = sanitizedName.length > 0 ? sanitizedName : 'report';

  return `PsittaWell-${namePart}-${formatFilenameDate(date)}.pdf`;
}

export function buildAssessmentFormReportFilename(parrotName: string, completedDate: Date): string {
  const sanitizedName = sanitizeReportFilenameSegment(parrotName);
  const namePart = sanitizedName.length > 0 ? sanitizedName : 'form';

  return `PsittaWell-Form-${namePart}-${formatFilenameDate(completedDate)}.pdf`;
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

function getErrorStringProperty(error: unknown, property: 'code' | 'message'): string | null {
  if (error === null || typeof error !== 'object' || !(property in error)) {
    return null;
  }

  const value = (error as Record<string, unknown>)[property];

  return typeof value === 'string' && value.length > 0 ? value : null;
}
