import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
      </View>
    </View>
  );
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
});
