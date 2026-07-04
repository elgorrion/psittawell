import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '../components/SectionHeader';
import { psittawelContentPack } from '../content/psittawel';
import { createDraftAssessment } from '../lib/assessments';
import { getSchemaVersion } from '../lib/db';
import { t } from '../lib/i18n';
import { colors } from '../lib/theme';

type DatabaseState =
  | { status: 'opening' }
  | { status: 'ready' }
  | { status: 'unavailable' };

export default function HomeScreen() {
  const [databaseState, setDatabaseState] = useState<DatabaseState>({ status: 'opening' });

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) {
        return;
      }

      try {
        getSchemaVersion();
        setDatabaseState({ status: 'ready' });
      } catch {
        setDatabaseState({ status: 'unavailable' });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

function startAssessment(setDatabaseState: (state: DatabaseState) => void) {
  try {
    const assessmentId = createDraftAssessment(psittawelContentPack.instrument_version);

    router.push({
      pathname: '/assessment/[id]/section/[sectionId]',
      params: { id: String(assessmentId), sectionId: 's1_general' },
    });
  } catch {
    setDatabaseState({ status: 'unavailable' });
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mintSoft,
  },
  content: {
    flexGrow: 1,
    gap: 20,
    justifyContent: 'center',
    padding: 20,
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
});
