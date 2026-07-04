import { getLocales } from 'expo-localization';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '../components/SectionHeader';
import { psittawelContentPack } from '../content/psittawel';
import {
  createDraftAssessment,
  listAssessments,
  type AssessmentSummary,
} from '../lib/assessments';
import { getSchemaVersion } from '../lib/db';
import { t } from '../lib/i18n';
import { colors } from '../lib/theme';

type DatabaseState =
  | { status: 'opening' }
  | { status: 'ready' }
  | { status: 'unavailable' };

export default function HomeScreen() {
  const [databaseState, setDatabaseState] = useState<DatabaseState>({ status: 'opening' });
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(getDeviceLocale(), {
        dateStyle: 'medium',
      }),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.resolve().then(() => {
        if (!isMounted) {
          return;
        }

        try {
          getSchemaVersion();
          setAssessments(listAssessments());
          setDatabaseState({ status: 'ready' });
        } catch {
          setAssessments([]);
          setDatabaseState({ status: 'unavailable' });
        }
      });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          assessments.length === 0 ? styles.contentCentered : null,
        ]}
      >
        <SectionHeader description={t('home.description')} title={t('home.title')} />
        {databaseState.status === 'unavailable' ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{t('home.databaseUnavailable')}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={t('home.startAssessment')}
          accessibilityRole="button"
          disabled={databaseState.status !== 'ready'}
          onPress={() => startAssessment(setDatabaseState)}
          style={[
            styles.startButton,
            databaseState.status !== 'ready' ? styles.startButtonDisabled : null,
          ]}
        >
          <Text style={styles.startButtonText}>{t('home.startAssessment')}</Text>
        </Pressable>
        {assessments.length > 0 ? (
          <View style={styles.assessmentList}>
            <Text accessibilityRole="header" style={styles.assessmentListTitle}>
              {t('home.savedAssessments')}
            </Text>
            {assessments.map((assessment) => (
              <AssessmentRow
                assessment={assessment}
                dateFormatter={dateFormatter}
                key={assessment.id}
              />
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={t('about.homeLinkAccessibility')}
          accessibilityRole="button"
          onPress={() => router.push('/about')}
          style={styles.aboutLink}
        >
          <Text style={styles.aboutLinkText}>{t('about.linkLabel')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function startAssessment(setDatabaseState: (state: DatabaseState) => void) {
  try {
    const assessmentId = createDraftAssessment(psittawelContentPack.instrument_version);

    router.push({
      pathname: '/assessment/[id]',
      params: { id: String(assessmentId) },
    });
  } catch {
    setDatabaseState({ status: 'unavailable' });
  }
}

type AssessmentRowProps = {
  assessment: AssessmentSummary;
  dateFormatter: Intl.DateTimeFormat;
};

function AssessmentRow({ assessment, dateFormatter }: AssessmentRowProps) {
  const name = assessment.parrotName ?? t('home.unnamedAssessment');
  const status = t(`home.assessmentStatus.${assessment.status}`);
  const startedDate = dateFormatter.format(parseSqliteTimestamp(assessment.startedAt));

  return (
    <Pressable
      accessibilityLabel={t('home.assessmentRowAccessibility', {
        name,
        status,
        date: startedDate,
      })}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/assessment/[id]',
          params: { id: String(assessment.id) },
        })
      }
      style={styles.assessmentRow}
    >
      <View style={styles.assessmentRowText}>
        <Text style={styles.assessmentName}>{name}</Text>
        <Text style={styles.assessmentDate}>
          {t('home.startedDate', { date: startedDate })}
        </Text>
      </View>
      <Text style={styles.assessmentStatus}>{status}</Text>
    </Pressable>
  );
}

function getDeviceLocale() {
  const [locale] = getLocales();

  return locale?.languageTag ?? locale?.languageCode ?? undefined;
}

function parseSqliteTimestamp(value: string) {
  return new Date(`${value.replace(' ', 'T')}Z`);
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
    color: '#8A2C18',
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
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 68,
    padding: 14,
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
  aboutLink: {
    alignSelf: 'center',
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aboutLinkText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
});
