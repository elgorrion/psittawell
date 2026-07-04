import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { t } from './i18n';

export type ShareResultsReportOutcome = 'shared' | 'unavailable';

export async function isResultsReportSharingAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  return Sharing.isAvailableAsync();
}

export async function shareResultsReport(html: string): Promise<ShareResultsReportOutcome> {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }

  if (!(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }

  const { uri } = await Print.printToFileAsync({ html });

  await Sharing.shareAsync(uri, {
    UTI: 'com.adobe.pdf',
    dialogTitle: t('assessment.report.shareDialogTitle'),
    mimeType: 'application/pdf',
  });

  return 'shared';
}
