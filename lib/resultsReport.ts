import { welfareLevelColors } from '../components/questions/Badges';
import type { OptionFlag, WelfareLevel } from '../content/schema';
import { t } from './i18n';
import type {
  AssessmentResults,
  AttentionItem,
  ObserveItem,
  ReviewedSection,
  SectionAttention,
  UrgentItem,
} from './results';
import { colors } from './theme';

export type ResultsReportInput = {
  parrotName: string;
  results: AssessmentResults;
  generatedAtLabel: string;
};

const textStyles = {
  page: `margin:0; padding:0; background:${colors.mintSoft}; color:${colors.text}; font-family:Arial, Helvetica, sans-serif;`,
  shell: 'max-width:760px; margin:0 auto; padding:32px 28px 40px;',
  header: `background:${colors.spruce}; color:${colors.paper}; border-radius:8px; padding:24px; margin-bottom:18px;`,
  title: 'margin:0 0 10px; font-size:28px; line-height:34px; font-weight:800;',
  generated: 'margin:0; font-size:13px; line-height:18px; font-weight:700;',
  panel: `background:${colors.paper}; border:1px solid ${colors.line}; border-radius:8px; padding:18px; margin-bottom:16px;`,
  panelStrong: `background:${colors.help}; border:2px solid ${colors.spruce}; border-radius:8px; padding:18px; margin-bottom:16px;`,
  sectionTitle: `margin:0 0 8px; color:${colors.spruceInk}; font-size:20px; line-height:26px; font-weight:800;`,
  sectionDescription: `margin:0 0 14px; color:${colors.textMuted}; font-size:14px; line-height:20px;`,
  paragraph: `margin:0; color:${colors.slate}; font-size:14px; line-height:20px;`,
  list: 'margin:0; padding:0; list-style:none;',
  item: `border:1px solid ${colors.line}; border-radius:8px; padding:12px; margin-top:10px; background:${colors.paper};`,
  sectionEyebrow: `margin:0 0 5px; color:${colors.spruceDark}; font-size:12px; line-height:16px; font-weight:800; text-transform:uppercase;`,
  itemPrompt: `margin:0 0 5px; color:${colors.text}; font-size:14px; line-height:20px; font-weight:800;`,
  itemRow: `margin:0 0 5px; color:${colors.textMuted}; font-size:13px; line-height:18px; font-weight:700;`,
  itemAnswer: `margin:0; color:${colors.slate}; font-size:13px; line-height:18px;`,
  badgeRow: 'margin-top:8px;',
  flagBadge: `display:inline-block; margin:0 6px 6px 0; border:1px solid ${colors.lineStrong}; border-radius:999px; padding:4px 9px; color:${colors.spruceInk}; background:${colors.mint}; font-size:12px; line-height:16px; font-weight:800;`,
  welfareBadge: `display:inline-block; margin-top:8px; border:1px solid ${colors.line}; border-radius:999px; padding:5px 10px; color:${colors.spruceInk}; background:${colors.mint}; font-size:12px; line-height:16px; font-weight:800;`,
  welfareDot: 'display:inline-block; width:9px; height:9px; border-radius:999px; margin-right:7px;',
  nestedTitle: `margin:14px 0 4px; color:${colors.spruceInk}; font-size:15px; line-height:21px; font-weight:800;`,
  chips: 'margin-top:8px;',
  chip: `display:inline-block; margin:0 6px 6px 0; border:1px solid ${colors.line}; border-radius:999px; padding:6px 10px; color:${colors.textMuted}; background:${colors.paper}; font-size:12px; line-height:16px; font-weight:700;`,
} as const;

export function buildResultsReportHtml({
  parrotName,
  results,
  generatedAtLabel,
}: ResultsReportInput): string {
  const trimmedName = parrotName.trim();
  const title =
    trimmedName.length > 0
      ? t('assessment.report.namedTitle', { name: trimmedName })
      : t('assessment.report.title');

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    `<body style="${textStyles.page}">`,
    `<main style="${textStyles.shell}">`,
    renderHeader(title, generatedAtLabel),
    renderParagraphPanel(t('assessment.results.disclaimer')),
    renderConsultPanel(),
    renderUrgent(results.urgent),
    renderAttention(results.attention),
    renderObserve(results.observe),
    renderReviewed(results.sectionsReviewed),
    renderParagraphPanel(t('assessment.results.monthlyNote')),
    renderConsultPanel(),
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}

function renderHeader(title: string, generatedAtLabel: string): string {
  const generatedText = t('assessment.report.generatedOn', { date: generatedAtLabel });

  return [
    `<header style="${textStyles.header}">`,
    `<h1 style="${textStyles.title}">${escapeHtml(title)}</h1>`,
    `<p style="${textStyles.generated}">${escapeHtml(generatedText)}</p>`,
    '</header>',
  ].join('');
}

function renderParagraphPanel(text: string): string {
  return [
    `<section style="${textStyles.panel}">`,
    `<p style="${textStyles.paragraph}">${escapeHtml(text)}</p>`,
    '</section>',
  ].join('');
}

function renderConsultPanel(): string {
  return [
    `<section style="${textStyles.panelStrong}">`,
    `<h2 style="${textStyles.sectionTitle}">${escapeHtml(t('assessment.results.consult.title'))}</h2>`,
    `<p style="${textStyles.paragraph}">${escapeHtml(t('assessment.consultNote'))}</p>`,
    `<p style="${textStyles.paragraph}; margin-top:8px;">${escapeHtml(
      t('assessment.results.consult.description'),
    )}</p>`,
    '</section>',
  ].join('');
}

function renderUrgent(items: readonly UrgentItem[]): string {
  if (items.length === 0) {
    return '';
  }

  return renderSection({
    title: t('assessment.results.urgent.title'),
    description: t('assessment.results.urgent.description'),
    body: `<ul style="${textStyles.list}">${items.map(renderUrgentItem).join('')}</ul>`,
  });
}

function renderAttention(sections: readonly SectionAttention[]): string {
  const body =
    sections.length > 0
      ? sections.map(renderAttentionSection).join('')
      : `<p style="${textStyles.paragraph}">${escapeHtml(
          t('assessment.results.attention.empty'),
        )}</p>`;

  return renderSection({
    title: t('assessment.results.attention.title'),
    description: t('assessment.results.attention.description'),
    body,
  });
}

function renderObserve(items: readonly ObserveItem[]): string {
  if (items.length === 0) {
    return '';
  }

  return renderSection({
    title: t('assessment.results.observe.title'),
    description: t('assessment.results.observe.description'),
    body: `<ul style="${textStyles.list}">${items.map(renderObserveItem).join('')}</ul>`,
  });
}

function renderReviewed(sections: readonly ReviewedSection[]): string {
  const body =
    sections.length > 0
      ? `<div style="${textStyles.chips}">${sections.map(renderReviewedChip).join('')}</div>`
      : `<p style="${textStyles.paragraph}">${escapeHtml(
          t('assessment.results.reviewed.empty'),
        )}</p>`;

  return renderSection({
    title: t('assessment.results.reviewed.title'),
    description: t('assessment.results.reviewed.description'),
    body,
  });
}

function renderSection({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string;
}): string {
  return [
    `<section style="${textStyles.panel}">`,
    `<h2 style="${textStyles.sectionTitle}">${escapeHtml(title)}</h2>`,
    `<p style="${textStyles.sectionDescription}">${escapeHtml(description)}</p>`,
    body,
    '</section>',
  ].join('');
}

function renderAttentionSection(section: SectionAttention): string {
  return [
    `<h3 style="${textStyles.nestedTitle}">${escapeHtml(section.sectionTitle)}</h3>`,
    `<ul style="${textStyles.list}">${section.items.map(renderAttentionItem).join('')}</ul>`,
  ].join('');
}

function renderUrgentItem(item: UrgentItem): string {
  return [
    `<li style="${textStyles.item}">`,
    renderItemText(item, true),
    renderFlagBadges(item.flags),
    '</li>',
  ].join('');
}

function renderAttentionItem(item: AttentionItem): string {
  return [
    `<li style="${textStyles.item}">`,
    renderItemText(item, false),
    renderWelfareBadge(item.welfareLevel),
    '</li>',
  ].join('');
}

function renderObserveItem(item: ObserveItem): string {
  return [
    `<li style="${textStyles.item}">`,
    renderItemText(item, true),
    renderFlagBadges([item.flag]),
    '</li>',
  ].join('');
}

function renderItemText(
  item: {
    questionPrompt: string;
    rowLabel?: string;
    optionLabel: string;
    sectionTitle?: string;
  },
  includeSection: boolean,
): string {
  return [
    includeSection && item.sectionTitle
      ? `<p style="${textStyles.sectionEyebrow}">${escapeHtml(item.sectionTitle)}</p>`
      : '',
    `<p style="${textStyles.itemPrompt}">${escapeHtml(item.questionPrompt)}</p>`,
    item.rowLabel ? `<p style="${textStyles.itemRow}">${escapeHtml(item.rowLabel)}</p>` : '',
    `<p style="${textStyles.itemAnswer}">${escapeHtml(item.optionLabel)}</p>`,
  ].join('');
}

function renderFlagBadges(flags: readonly OptionFlag[]): string {
  return [
    `<div style="${textStyles.badgeRow}">`,
    flags.map((flag) => `<span style="${textStyles.flagBadge}">${escapeHtml(flagText(flag))}</span>`).join(''),
    '</div>',
  ].join('');
}

function renderWelfareBadge(welfareLevel: WelfareLevel): string {
  const dotStyle = `${textStyles.welfareDot} background:${welfareLevelColors[welfareLevel]};`;

  return [
    `<span style="${textStyles.welfareBadge}">`,
    `<span style="${dotStyle}"></span>`,
    escapeHtml(t(`assessment.welfareLevelShort.${welfareLevel}`)),
    '</span>',
  ].join('');
}

function renderReviewedChip(section: ReviewedSection): string {
  return `<span style="${textStyles.chip}">${escapeHtml(section.sectionTitle)}</span>`;
}

function flagText(flag: OptionFlag): string {
  return t(`assessment.flags.${flag}.text`);
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
