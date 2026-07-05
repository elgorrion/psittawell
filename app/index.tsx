import { router, Stack, useFocusEffect } from 'expo-router';
import { Globe, Info, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '../components/SectionHeader';
import { psittawelContentPack } from '../content/psittawel';
import {
  createDraftAssessment,
  createFollowUpAssessment,
  deleteAssessment,
  getLatestCompletedAssessment,
  listAssessments,
  parseSqliteTimestamp,
  type AssessmentSummary,
} from '../lib/assessments';
import { getSchemaVersion } from '../lib/db';
import {
  applyLanguagePreference,
  getAppLocale,
  resolveLocalePreference,
  t,
} from '../lib/i18n';
import {
  getLanguagePreference,
  languagePreferenceValues,
  setLanguagePreference,
  type LanguagePreference,
} from '../lib/preferences';
import { colors } from '../lib/theme';

type DatabaseState =
  | { status: 'opening' }
  | { status: 'ready' }
  | { status: 'unavailable' };

export default function HomeScreen() {
  const [databaseState, setDatabaseState] = useState<DatabaseState>({ status: 'opening' });
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [latestCompletedAssessment, setLatestCompletedAssessment] =
    useState<AssessmentSummary | null>(null);
  const [languagePreference, setLanguagePreferenceState] =
    useState<LanguagePreference>('system');
  const [isLanguageDialogVisible, setIsLanguageDialogVisible] = useState(false);
  const localeCode = getAppLocale();
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeCode, {
        dateStyle: 'medium',
      }),
    [localeCode],
  );

  const refreshAssessments = useCallback(() => {
    setAssessments(listAssessments());
    setLatestCompletedAssessment(getLatestCompletedAssessment());
    setLanguagePreferenceState(getLanguagePreference());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.resolve().then(() => {
        if (!isMounted) {
          return;
        }

        try {
          getSchemaVersion();
          refreshAssessments();
          setDatabaseState({ status: 'ready' });
        } catch {
          setAssessments([]);
          setLatestCompletedAssessment(null);
          setDatabaseState({ status: 'unavailable' });
        }
      });

      return () => {
        isMounted = false;
      };
    }, [refreshAssessments]),
  );

  const primaryCtaLabel =
    latestCompletedAssessment === null
      ? t('home.startAssessment')
      : getFollowUpCtaLabel(latestCompletedAssessment.parrotName);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark' }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          assessments.length === 0 ? styles.contentCentered : null,
        ]}
      >
        <SectionHeader description={t('home.description')} title={t('home.title')} />
        {databaseState.status === 'unavailable' ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {t(getDatabaseUnavailableMessageKey(Platform.OS))}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={primaryCtaLabel}
          accessibilityRole="button"
          disabled={databaseState.status !== 'ready'}
          onPress={() =>
            startPrimaryAssessment(latestCompletedAssessment, setDatabaseState)
          }
          style={[
            styles.startButton,
            databaseState.status !== 'ready' ? styles.startButtonDisabled : null,
          ]}
        >
          <Text style={styles.startButtonText}>{primaryCtaLabel}</Text>
        </Pressable>
        {latestCompletedAssessment !== null ? (
          <Pressable
            accessibilityLabel={t('home.startDifferentParrot')}
            accessibilityRole="button"
            disabled={databaseState.status !== 'ready'}
            onPress={() => startDraftAssessment(setDatabaseState)}
            style={[
              styles.secondaryButton,
              databaseState.status !== 'ready' ? styles.secondaryButtonDisabled : null,
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                databaseState.status !== 'ready' ? styles.secondaryButtonTextDisabled : null,
              ]}
            >
              {t('home.startDifferentParrot')}
            </Text>
          </Pressable>
        ) : null}
        {assessments.length > 0 ? (
          <View style={styles.assessmentList}>
            <Text accessibilityRole="header" aria-level={2} style={styles.assessmentListTitle}>
              {t('home.savedAssessments')}
            </Text>
            {assessments.map((assessment) => (
              <AssessmentRow
                assessment={assessment}
                dateFormatter={dateFormatter}
                key={assessment.id}
                onDeleted={refreshAssessments}
                onUnavailable={() => setDatabaseState({ status: 'unavailable' })}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.footerActions}>
          <Pressable
            accessibilityLabel={t('about.homeLinkAccessibility')}
            accessibilityRole="button"
            onPress={() => router.push('/about')}
            style={styles.footerButton}
          >
            <Info color={colors.spruceDark} size={16} strokeWidth={2.2} />
            <Text numberOfLines={2} style={styles.footerButtonText}>
              {t('about.linkLabel')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('home.language.buttonAccessibility', {
              language: getLanguageButtonLabel(languagePreference, localeCode),
            })}
            accessibilityRole="button"
            onPress={() => setIsLanguageDialogVisible(true)}
            style={styles.footerButton}
          >
            <Globe color={colors.spruceDark} size={16} strokeWidth={2.2} />
            <Text numberOfLines={2} style={styles.footerButtonText}>
              {getLanguageButtonLabel(languagePreference, localeCode)}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <LanguageDialog
        isVisible={isLanguageDialogVisible}
        localeCode={resolveLocalePreference('system')}
        onClose={() => setIsLanguageDialogVisible(false)}
        onSelect={(preference) => {
          try {
            setLanguagePreference(preference);
            setLanguagePreferenceState(preference);
            applyLanguagePreference(preference);
            setIsLanguageDialogVisible(false);
          } catch {
            setDatabaseState({ status: 'unavailable' });
            setIsLanguageDialogVisible(false);
          }
        }}
        selectedPreference={languagePreference}
      />
    </SafeAreaView>
  );
}

function startPrimaryAssessment(
  latestCompletedAssessment: AssessmentSummary | null,
  setDatabaseState: (state: DatabaseState) => void,
) {
  if (latestCompletedAssessment === null) {
    startDraftAssessment(setDatabaseState);
    return;
  }

  try {
    const assessmentId = createFollowUpAssessment(
      latestCompletedAssessment.id,
      psittawelContentPack.sections,
    );

    navigateToAssessment(assessmentId);
  } catch {
    setDatabaseState({ status: 'unavailable' });
  }
}

function startDraftAssessment(setDatabaseState: (state: DatabaseState) => void) {
  try {
    const assessmentId = createDraftAssessment(psittawelContentPack.instrument_version);

    navigateToAssessment(assessmentId);
  } catch {
    setDatabaseState({ status: 'unavailable' });
  }
}

function navigateToAssessment(assessmentId: number) {
  router.push({
    pathname: '/assessment/[id]',
    params: { id: String(assessmentId) },
  });
}

export function getFollowUpCtaLabel(parrotName: string | null) {
  return parrotName
    ? t('home.startNextCheckNamed', { name: parrotName })
    : t('home.startNextCheckUnnamed');
}

export function getDatabaseUnavailableMessageKey(platformOS: typeof Platform.OS) {
  return platformOS === 'web'
    ? 'home.databaseUnavailableWeb'
    : 'home.databaseUnavailable';
}

type AssessmentRowProps = {
  assessment: AssessmentSummary;
  dateFormatter: Intl.DateTimeFormat;
  onDeleted: () => void;
  onUnavailable: () => void;
};

export function AssessmentRow({
  assessment,
  dateFormatter,
  onDeleted,
  onUnavailable,
}: AssessmentRowProps) {
  const name = assessment.parrotName ?? t('home.unnamedAssessment');
  const status = t(`home.assessmentStatus.${assessment.status}`);
  const startedDate = dateFormatter.format(parseSqliteTimestamp(assessment.startedAt));

  function handleDelete() {
    Alert.alert(getDeleteTitle(assessment), getDeleteMessage(assessment, name), [
      {
        text: t('home.deleteConfirmCancel'),
        style: 'cancel',
      },
      {
        text: t('home.deleteConfirmDelete'),
        style: 'destructive',
        onPress() {
          try {
            deleteAssessment(assessment.id);
            onDeleted();
          } catch {
            onUnavailable();
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.assessmentRow}>
      <Pressable
        accessibilityLabel={t('home.assessmentRowAccessibility', {
          name,
          status,
          date: startedDate,
        })}
        accessibilityRole="button"
        onPress={() => navigateToAssessment(assessment.id)}
        style={styles.assessmentRowOpenButton}
      >
        <View style={styles.assessmentRowText}>
          <Text numberOfLines={2} style={styles.assessmentName}>
            {name}
          </Text>
          <Text style={styles.assessmentDate}>
            {t('home.startedDate', { date: startedDate })}
          </Text>
        </View>
        <Text style={styles.assessmentStatus}>{status}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={t('home.deleteAssessmentAccessibility', {
          name,
          status,
        })}
        accessibilityRole="button"
        onPress={handleDelete}
        style={styles.deleteButton}
      >
        <Trash2 color={colors.danger} size={19} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

function getDeleteTitle(assessment: AssessmentSummary) {
  return assessment.status === 'completed'
    ? t('home.deleteCompletedTitle')
    : t('home.deleteDraftTitle');
}

function getDeleteMessage(assessment: AssessmentSummary, name: string) {
  if (assessment.status !== 'completed') {
    return t('home.deleteDraftMessage');
  }

  return assessment.parrotName
    ? t('home.deleteCompletedMessageNamed', { name })
    : t('home.deleteCompletedMessageUnnamed');
}

type LanguageDialogProps = {
  isVisible: boolean;
  localeCode: string;
  onClose: () => void;
  onSelect: (preference: LanguagePreference) => void;
  selectedPreference: LanguagePreference;
};

function LanguageDialog({
  isVisible,
  localeCode,
  onClose,
  onSelect,
  selectedPreference,
}: LanguageDialogProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <Pressable
        accessibilityLabel={t('home.language.close')}
        accessibilityRole="button"
        onPress={onClose}
        style={styles.modalScrim}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={styles.languageSheet}
        >
          <View style={styles.languageSheetHeader}>
            <Text accessibilityRole="header" aria-level={2} style={styles.languageTitle}>
              {t('home.language.title')}
            </Text>
            <Pressable
              accessibilityLabel={t('home.language.close')}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.languageCloseButton}
            >
              <Text style={styles.languageCloseText}>{t('home.language.close')}</Text>
            </Pressable>
          </View>
          <View accessibilityRole="radiogroup" style={styles.languageOptions}>
            {languagePreferenceValues.map((preference) => (
              <LanguageOption
                key={preference}
                localeCode={localeCode}
                onSelect={onSelect}
                preference={preference}
                selectedPreference={selectedPreference}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type LanguageOptionProps = {
  localeCode: string;
  onSelect: (preference: LanguagePreference) => void;
  preference: LanguagePreference;
  selectedPreference: LanguagePreference;
};

function LanguageOption({
  localeCode,
  onSelect,
  preference,
  selectedPreference,
}: LanguageOptionProps) {
  const isSelected = preference === selectedPreference;
  const label = getLanguageOptionLabel(preference);
  const hint =
    preference === 'system'
      ? t('home.language.systemResolved', {
          language: getResolvedLanguageName(localeCode),
        })
      : undefined;
  const accessibilityLabel = hint
    ? t('home.language.optionAccessibility', { option: label, detail: hint })
    : label;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={() => onSelect(preference)}
      style={[styles.languageOption, isSelected ? styles.languageOptionSelected : null]}
    >
      <View
        style={[styles.radioOuter, isSelected ? styles.radioOuterSelected : null]}
      >
        {isSelected ? (
          <View style={styles.radioInner} />
        ) : null}
      </View>
      <View style={styles.languageOptionText}>
        <Text style={styles.languageOptionLabel}>{label}</Text>
        {hint ? <Text style={styles.languageOptionHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export function getLanguageButtonLabel(
  preference: LanguagePreference,
  localeCode: string,
) {
  return preference === 'system'
    ? getResolvedLanguageName(localeCode)
    : getLanguageOptionLabel(preference);
}

function getLanguageOptionLabel(preference: LanguagePreference) {
  switch (preference) {
    case 'system':
      return t('home.language.system');
    case 'de':
      return t('home.language.german');
    case 'en':
      return t('home.language.english');
  }
}

function getResolvedLanguageName(localeCode: string) {
  return localeCode === 'de' ? t('home.language.german') : t('home.language.english');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mintSoft,
  },
  content: {
    flexGrow: 1,
    gap: 20,
    padding: 20,
  },
  contentCentered: {
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#FBE7E1',
    borderColor: '#E7B3A6',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  startButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.spruce,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  startButtonDisabled: {
    backgroundColor: '#7A8C85',
  },
  startButtonText: {
    color: colors.paper,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: colors.spruce,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonDisabled: {
    borderColor: colors.lineStrong,
  },
  secondaryButtonText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  secondaryButtonTextDisabled: {
    color: colors.textMuted,
  },
  assessmentList: {
    gap: 10,
  },
  assessmentListTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  assessmentRow: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    padding: 10,
  },
  assessmentRowOpenButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    minWidth: 0,
  },
  assessmentRowText: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
  },
  assessmentName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  assessmentDate: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  assessmentStatus: {
    color: colors.spruceDark,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  footerActions: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 2,
  },
  footerButton: {
    alignItems: 'center',
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerButtonText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  modalScrim: {
    backgroundColor: 'rgba(18, 49, 42, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  languageSheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 14,
    padding: 20,
    paddingBottom: 28,
  },
  languageSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  languageTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  languageCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  languageCloseText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  languageOptionSelected: {
    backgroundColor: colors.help,
    borderColor: colors.spruce,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.lineStrong,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioOuterSelected: {
    borderColor: colors.spruceDark,
  },
  radioInner: {
    backgroundColor: colors.spruceDark,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  languageOptionText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  languageOptionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  languageOptionHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
