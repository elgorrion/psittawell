import { openURL } from 'expo-linking';
import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAboutInstrumentSource } from '../lib/about';
import { t } from '../lib/i18n';
import { colors } from '../lib/theme';
import { HomeHeaderUpButton, navigateUpToHome } from '../components/AssessmentNavigation';

const source = getAboutInstrumentSource();

const headerLeft = ({ tintColor }: { tintColor?: import('react-native').ColorValue }) => (
  <HomeHeaderUpButton tintColor={tintColor} />
);

export default function AboutScreen() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: t('about.title'), headerLeft }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}>{t('about.description')}</Text>

        <AboutPanel title={t('about.what.title')}>
          <Text style={styles.paragraph}>{t('about.what.body')}</Text>
          <Text style={styles.paragraph}>
            {t('about.what.notDiagnostic', { consultNote: t('assessment.consultNote') })}
          </Text>
        </AboutPanel>

        <AboutPanel title={t('about.instrument.title')}>
          <Text style={styles.paragraph}>{t('about.instrument.developedBy')}</Text>
          <View style={styles.sourceBlock}>
            <Text style={styles.sourceLabel}>{t('about.instrument.citationLabel')}</Text>
            <Text style={styles.paragraph}>{source.citation}</Text>
          </View>
          <ExternalLink
            accessibilityLabel={t('about.instrument.doiAccessibility', { doi: source.doi })}
            label={t('about.instrument.doiLabel', { doi: source.doi })}
            url={source.doiUrl}
          />
          <ExternalLink
            accessibilityLabel={t('about.instrument.toolUrlAccessibility')}
            label={source.toolUrl}
            url={source.toolUrl}
          />
        </AboutPanel>

        <AboutPanel title={t('about.permission.title')}>
          <Text style={styles.paragraph}>{source.contentLicence}</Text>
          <Text style={styles.paragraph}>{t('about.permission.releaseGate')}</Text>
        </AboutPanel>

        <AboutPanel title={t('about.imagery.title')}>
          <Text style={styles.paragraph}>{t('about.imagery.body')}</Text>
        </AboutPanel>

        <AboutPanel title={t('about.app.title')}>
          <Text style={styles.paragraph}>{t('about.app.body')}</Text>
          <Text style={styles.paragraph}>{t('about.app.notMonetised')}</Text>
        </AboutPanel>

        <AboutPanel title={t('about.privacy.title')}>
          <Text style={styles.paragraph}>{t('about.privacy.body')}</Text>
        </AboutPanel>

        <Pressable
          accessibilityLabel={t('about.backHome')}
          accessibilityRole="button"
          onPress={navigateUpToHome}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{t('about.backHome')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type AboutPanelProps = {
  title: string;
  children: ReactNode;
};

function AboutPanel({ title, children }: AboutPanelProps) {
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

type ExternalLinkProps = {
  label: string;
  url: string;
  accessibilityLabel: string;
};

function ExternalLink({ label, url, accessibilityLabel }: ExternalLinkProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="link"
      onPress={() => {
        void openURL(url);
      }}
      style={styles.linkButton}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.mintSoft,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  introText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  panel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  paragraph: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 22,
  },
  sourceBlock: {
    gap: 4,
  },
  sourceLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  linkButton: {
    alignSelf: 'flex-start',
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.spruce,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
