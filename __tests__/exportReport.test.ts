const mockMove = jest.fn();
const mockPrintToFileAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();

jest.mock('expo-file-system', () => ({
  __esModule: true,
  File: jest.fn().mockImplementation((...parts: Array<{ uri?: string } | string>) => {
    const uri = parts
      .map((part) => (typeof part === 'string' ? part : part.uri ?? ''))
      .join('');

    return {
      move: mockMove,
      uri,
    };
  }),
  Paths: {
    cache: { uri: 'file:///cache/' },
  },
}));

jest.mock('expo-print', () => ({
  __esModule: true,
  printToFileAsync: mockPrintToFileAsync,
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: mockIsAvailableAsync,
  shareAsync: mockShareAsync,
}));

const {
  buildAssessmentFormReportFilename,
  buildResultsReportFilename,
  sanitizeReportFilenameSegment,
  sharePdfReport,
  shareResultsReport,
} = require('../lib/exportReport') as typeof import('../lib/exportReport');

describe('report export filenames', () => {
  beforeEach(() => {
    mockMove.mockReset();
    mockPrintToFileAsync.mockReset();
    mockShareAsync.mockReset();
    mockIsAvailableAsync.mockReset();
  });

  it('builds a locale-neutral human PDF filename with a sanitized parrot name', () => {
    expect(
      buildResultsReportFilename('  Kiwi / Blue: west?  ', new Date(2026, 6, 4)),
    ).toBe('PsittaWell-Kiwi-Blue-west-2026-07-04.pdf');
    expect(buildResultsReportFilename('Grün Weiß', new Date(2026, 0, 9))).toBe(
      'PsittaWell-Grün-Weiß-2026-01-09.pdf',
    );
  });

  it('builds a locale-neutral filled form filename with the completed date', () => {
    expect(
      buildAssessmentFormReportFilename('  Kiwi / Blue: west?  ', new Date(2026, 6, 5)),
    ).toBe('PsittaWell-Form-Kiwi-Blue-west-2026-07-05.pdf');
    expect(buildAssessmentFormReportFilename(' ../* ', new Date(2026, 6, 5))).toBe(
      'PsittaWell-Form-form-2026-07-05.pdf',
    );
  });

  it('falls back to report when the sanitized name is empty', () => {
    expect(buildResultsReportFilename(' ../* ', new Date(2026, 6, 4))).toBe(
      'PsittaWell-report-2026-07-04.pdf',
    );
  });

  it('removes path and control characters from filename segments', () => {
    expect(sanitizeReportFilenameSegment(' Mango\n../:star* ')).toBe('Mango-star');
  });

  it('moves the printed PDF to the human filename before sharing', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockPrintToFileAsync.mockResolvedValue({
      numberOfPages: 1,
      uri: 'file:///tmp/print-output.pdf',
    });

    await expect(
      shareResultsReport('<html></html>', {
        now: new Date(2026, 6, 4),
        parrotName: 'Kiwi / Blue',
      }),
    ).resolves.toBe('shared');

    expect(mockMove).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'file:///cache/PsittaWell-Kiwi-Blue-2026-07-04.pdf',
      }),
      { overwrite: true },
    );
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/PsittaWell-Kiwi-Blue-2026-07-04.pdf',
      expect.objectContaining({
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      }),
    );
  });

  it('shares arbitrary generated PDF HTML with the supplied filename and dialog title', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockPrintToFileAsync.mockResolvedValue({
      numberOfPages: 1,
      uri: 'file:///tmp/form-output.pdf',
    });

    await expect(
      sharePdfReport('<html></html>', {
        dialogTitle: 'Share filled assessment form',
        filename: 'PsittaWell-Form-Kiwi-2026-07-05.pdf',
      }),
    ).resolves.toBe('shared');

    expect(mockMove).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'file:///cache/PsittaWell-Form-Kiwi-2026-07-05.pdf',
      }),
      { overwrite: true },
    );
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/PsittaWell-Form-Kiwi-2026-07-05.pdf',
      expect.objectContaining({
        dialogTitle: 'Share filled assessment form',
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      }),
    );
  });
});
