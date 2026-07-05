import { router } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { t } from '../lib/i18n';

export function assessmentOverviewRoute(assessmentId: number) {
  return {
    pathname: '/assessment/[id]' as const,
    params: { id: String(assessmentId) },
  };
}

export function assessmentResultsRoute(assessmentId: number) {
  return {
    pathname: '/assessment/[id]/results' as const,
    params: { id: String(assessmentId) },
  };
}

export function assessmentSectionRoute(assessmentId: number, sectionId: string) {
  return {
    pathname: '/assessment/[id]/section/[sectionId]' as const,
    params: { id: String(assessmentId), sectionId },
  };
}

export function navigateUpToAssessmentOverview(assessmentId: number) {
  const overviewRoute = assessmentOverviewRoute(assessmentId);

  if (router.canGoBack() || router.canDismiss()) {
    router.dismissTo(overviewRoute);
    return;
  }

  router.replace(overviewRoute);
}

export function navigateUpToHome() {
  if (router.canGoBack() || router.canDismiss()) {
    router.dismissTo('/');
    return;
  }

  router.replace('/');
}

function HeaderUpButton({
  accessibilityLabel,
  onPress,
  tintColor,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  tintColor?: ColorValue;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.headerBackButton}
    >
      <Text style={[styles.headerBackGlyph, tintColor ? { color: tintColor } : null]}>
        {'\u2039'}
      </Text>
    </Pressable>
  );
}

export function AssessmentHeaderUpButton({
  assessmentId,
  tintColor,
}: {
  assessmentId: number;
  tintColor?: ColorValue;
}) {
  if (!Number.isFinite(assessmentId)) {
    return null;
  }

  return (
    <HeaderUpButton
      accessibilityLabel={t('assessment.backToOverview')}
      onPress={() => navigateUpToAssessmentOverview(assessmentId)}
      tintColor={tintColor}
    />
  );
}

export function HomeHeaderUpButton({ tintColor }: { tintColor?: ColorValue }) {
  return (
    <HeaderUpButton
      accessibilityLabel={t('home.backToHome')}
      onPress={navigateUpToHome}
      tintColor={tintColor}
    />
  );
}

const styles = StyleSheet.create({
  headerBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  headerBackGlyph: {
    fontSize: 38,
    fontWeight: '400',
    lineHeight: 40,
  },
});
