import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getLanguagePreference } from '../lib/preferences';
import {
  applyLanguagePreference,
  getAppLocale,
  subscribeToLocaleChanges,
} from '../lib/i18n';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const [localeCode, setLocaleCode] = useState(getAppLocale());

  useEffect(() => {
    const unsubscribe = subscribeToLocaleChanges(setLocaleCode);

    try {
      applyLanguagePreference(getLanguagePreference());
    } catch {
      applyLanguagePreference('system');
    }

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        key={localeCode}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.spruce,
          },
          headerTintColor: colors.paper,
          headerTitleStyle: {
            color: colors.paper,
            fontWeight: '800',
          },
          statusBarStyle: 'light',
        }}
      />
    </SafeAreaProvider>
  );
}
