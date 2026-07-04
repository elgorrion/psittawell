import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { psittawelContentPack } from '../content/psittawel';
import { createDraftAssessment } from '../lib/assessments';
import { getSchemaVersion } from '../lib/db';
import { t } from '../lib/i18n';

type DatabaseState =
  | { status: 'opening' }
  | { status: 'ready'; schemaVersion: number }
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
        setDatabaseState({ status: 'ready', schemaVersion: getSchemaVersion() });
      } catch {
        setDatabaseState({ status: 'unavailable' });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('home.title')}
        </Text>
        <Text style={styles.description}>{t('home.description')}</Text>
        <Text style={styles.status}>{getDatabaseStatusText(databaseState)}</Text>
        <Pressable
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
      </View>
    </View>
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

function getDatabaseStatusText(databaseState: DatabaseState) {
  if (databaseState.status === 'ready') {
    return t('home.databaseReady', { version: databaseState.schemaVersion });
  }

  if (databaseState.status === 'unavailable') {
    return t('home.databaseUnavailable');
  }

  return t('home.databaseOpening');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FAF9',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#12312A',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
    marginBottom: 14,
  },
  description: {
    color: '#33524A',
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 520,
  },
  status: {
    color: '#26413B',
    fontSize: 14,
    lineHeight: 20,
  },
  startButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#12312A',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  startButtonDisabled: {
    backgroundColor: '#7F918B',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
});
