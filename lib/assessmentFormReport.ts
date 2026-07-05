import {
  welfareLevelColors,
  withFlagGlyph,
} from '../components/questions/Badges';
import { psittawelContentPack } from '../content/psittawel';
import type {
  ChoiceQuestion,
  Column,
  ColumnGroup,
  ContentPack,
  GridQuestion,
  GridRow,
  MatrixQuestion,
  Option,
  OptionFlag,
  Question,
  Row,
  Section,
  WelfareLevel,
} from '../content/schema';
import {
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getMatrixRowAnswerQuestionId,
  type AnswerLookup,
} from './assessments';
import { isQuestionVisible } from './conditionals';
import { escapeHtml } from './html';
import { t } from './i18n';
import { colors } from './theme';

export { escapeHtml } from './html';

export type AssessmentFormReportInput = {
  answers: AnswerLookup;
  appName: string;
  appVersion: string;
  completedAtLabel: string;
  contentPack?: ContentPack;
  parrotName: string;
};

type GridColumnDescriptor = {
  column: Column;
  columnGroup: ColumnGroup;
};

const emptyAnswers: AnswerLookup = {};

export function buildAssessmentFormHtml({
  answers,
  appName,
  appVersion,
  completedAtLabel,
  contentPack = psittawelContentPack,
  parrotName,
}: AssessmentFormReportInput): string {
  const title = t('assessment.formReport.title', { instrument: contentPack.instrument });
  const displayParrotName = parrotName.trim() || t('home.unnamedAssessment');

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    renderStyles(),
    '</head>',
    '<body>',
    '<main>',
    '<div class="front-page">',
    renderCover({
      appName,
      appVersion,
      completedAtLabel,
      contentPack,
      displayParrotName,
      title,
    }),
    renderLegend(),
    renderUsageNotice(contentPack),
    '</div>',
    contentPack.sections
      .map((section) => renderSection(section, answers, contentPack))
      .join(''),
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}

function renderCover({
  appName,
  appVersion,
  completedAtLabel,
  contentPack,
  displayParrotName,
  title,
}: {
  appName: string;
  appVersion: string;
  completedAtLabel: string;
  contentPack: ContentPack;
  displayParrotName: string;
  title: string;
}): string {
  return [
    '<section class="cover">',
    `<p class="cover-kicker">${escapeHtml(contentPack.instrument)}</p>`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class="developed-by">${escapeHtml(t('about.instrument.developedBy'))}</p>`,
    '<dl class="cover-meta">',
    renderMetaRow(t('assessment.formReport.parrotNameLabel'), displayParrotName),
    renderMetaRow(t('assessment.formReport.completedLabel'), completedAtLabel),
    renderMetaRow(
      t('assessment.formReport.appVersionLabel'),
      t('assessment.formReport.appVersionValue', {
        appName,
        version: appVersion,
      }),
    ),
    '</dl>',
    '</section>',
  ].join('');
}

function renderMetaRow(label: string, value: string): string {
  return [
    '<div class="meta-row">',
    `<dt>${escapeHtml(label)}</dt>`,
    `<dd>${escapeHtml(value)}</dd>`,
    '</div>',
  ].join('');
}

function renderSection(
  section: Section,
  answers: AnswerLookup,
  contentPack: ContentPack,
): string {
  return [
    `<section class="instrument-section" data-section-id="${escapeHtml(section.id)}">`,
    `<h2>${escapeHtml(
      t('assessment.sectionTitle', { number: section.number, title: section.title }),
    )}</h2>`,
    section.questions
      .map((question, index) => renderQuestion(question, section, index + 1, answers))
      .join(''),
    renderUsageNotice(contentPack),
    '</section>',
  ].join('');
}

function renderUsageNotice(contentPack: ContentPack): string {
  return `<footer class="usage-notice">${escapeHtml(contentPack.source.usage_notice)}</footer>`;
}

function renderQuestion(
  question: Question,
  section: Section,
  questionNumber: number,
  answers: AnswerLookup,
): string {
  const applicableAnswers = isQuestionVisible(question, answers) ? answers : emptyAnswers;

  return [
    `<article class="question" data-question-id="${escapeHtml(question.id)}">`,
    '<div class="question-heading">',
    `<span class="question-number">${escapeHtml(`${section.number}.${questionNumber}`)}</span>`,
    `<h3>${escapeHtml(question.prompt)}</h3>`,
    '</div>',
    renderFlagBadges(question.flags ?? []),
    renderTextBlock('help', question.help),
    renderTextBlock('note', question.note),
    renderImageCaption(question.image_ref),
    renderQuestionBody(question, section, applicableAnswers),
    '</article>',
  ].join('');
}

function renderQuestionBody(question: Question, section: Section, answers: AnswerLookup): string {
  switch (question.type) {
    case 'free_text':
      return renderFreeTextAnswer(answers[question.id]?.freeText ?? '', question.input.multiline);
    case 'single_choice':
    case 'yes_no':
    case 'scale':
      return renderChoiceOptions(question, section, answers, 'radio');
    case 'multi_choice':
      return renderChoiceOptions(question, section, answers, 'checkbox');
    case 'matrix':
      return renderMatrixQuestion(question, section, answers);
    case 'grid':
      return renderGridQuestion(question, section, answers);
  }
}

function renderFreeTextAnswer(value: string | null | undefined, multiline: boolean): string {
  return [
    `<div class="${multiline ? 'text-field text-field-multiline' : 'text-field'}">`,
    escapeHtml(value ?? ''),
    '</div>',
  ].join('');
}

function renderChoiceOptions(
  question: ChoiceQuestion,
  section: Section,
  answers: AnswerLookup,
  control: 'radio' | 'checkbox',
): string {
  const answer = answers[question.id];
  const selectedOptionIds = new Set(answer?.optionIds ?? []);
  const indicatorIcon = question.indicator_icon ?? section.indicator_icon;

  return [
    '<ul class="choice-list">',
    question.options
      .map((option) =>
        renderChoiceOption({
          answerText: answer?.freeText ?? '',
          control,
          indicatorIcon,
          option,
          selected: selectedOptionIds.has(option.id),
        }),
      )
      .join(''),
    '</ul>',
  ].join('');
}

function renderChoiceOption({
  answerText,
  control,
  indicatorIcon,
  option,
  selected,
}: {
  answerText: string | null | undefined;
  control: 'radio' | 'checkbox';
  indicatorIcon: Section['indicator_icon'];
  option: Option;
  selected: boolean;
}): string {
  return [
    `<li class="${
      selected ? 'choice-option choice-option-selected' : 'choice-option'
    }" data-option-id="${escapeHtml(option.id)}">`,
    `<span class="control">${escapeHtml(getControlGlyph(control, selected))}</span>`,
    renderWelfareDot(option.welfare_level, indicatorIcon),
    '<div class="choice-copy">',
    `<p class="option-label">${escapeHtml(option.label)}</p>`,
    renderTextBlock('option-detail', option.detail),
    renderFlagBadges(option.flags),
    renderImageCaption(option.image_ref),
    option.allow_text ? renderInlineField(answerText) : '',
    '</div>',
    '</li>',
  ].join('');
}

function renderMatrixQuestion(
  question: MatrixQuestion,
  section: Section,
  answers: AnswerLookup,
): string {
  const indicatorIcon = question.indicator_icon ?? section.indicator_icon;

  return question.row_groups
    .map((rowGroup, groupIndex) =>
      [
        '<div class="table-block">',
        rowGroup.label ? `<h4>${escapeHtml(rowGroup.label)}</h4>` : '',
        `<table class="form-table matrix-table" data-report-kind="matrix" data-group-index="${groupIndex}">`,
        renderFlatTableHead(rowGroup.columns, indicatorIcon),
        '<tbody>',
        rowGroup.rows
          .map((row) =>
            renderMatrixRow({
              answers,
              columns: rowGroup.columns,
              question,
              row,
            }),
          )
          .join(''),
        '</tbody>',
        '</table>',
        '</div>',
      ].join(''),
    )
    .join('');
}

function renderMatrixRow({
  answers,
  columns,
  question,
  row,
}: {
  answers: AnswerLookup;
  columns: readonly Column[];
  question: MatrixQuestion;
  row: Row;
}): string {
  const selectedColumnId =
    answers[getMatrixRowAnswerQuestionId(question.id, row.id)]?.optionIds[0] ?? null;

  return [
    `<tr data-row-id="${escapeHtml(row.id)}">`,
    `<th scope="row">${renderRowHeader(row)}</th>`,
    columns
      .map((column) =>
        renderSelectionCell({
          selected: selectedColumnId === column.id,
          column,
          mark: '●',
        }),
      )
      .join(''),
    '</tr>',
  ].join('');
}

function renderGridQuestion(
  question: GridQuestion,
  section: Section,
  answers: AnswerLookup,
): string {
  const indicatorIcon = question.indicator_icon ?? section.indicator_icon;
  const columns = question.column_groups.flatMap((columnGroup) =>
    columnGroup.columns.map((column) => ({ column, columnGroup })),
  );

  return [
    '<div class="table-block">',
    `<table class="form-table grid-table" data-report-kind="grid" data-selection="${escapeHtml(
      question.selection,
    )}">`,
    renderGridTableHead(question, indicatorIcon),
    '<tbody>',
    question.rows
      .map((row) =>
        renderGridRow({
          answers,
          columns,
          question,
          row,
        }),
      )
      .join(''),
    '</tbody>',
    '</table>',
    '</div>',
  ].join('');
}

function renderGridTableHead(question: GridQuestion, indicatorIcon: Section['indicator_icon']): string {
  const hasGroupLabels =
    question.column_groups.length > 1 ||
    question.column_groups.some((columnGroup) => columnGroup.label.trim().length > 0);

  return [
    '<thead>',
    hasGroupLabels
      ? [
          '<tr>',
          '<th scope="col" rowspan="2"></th>',
          question.column_groups
            .map((columnGroup) =>
              `<th class="column-group-heading" scope="colgroup" colspan="${
                columnGroup.columns.length
              }">${escapeHtml(columnGroup.label)}</th>`,
            )
            .join(''),
          '</tr>',
        ].join('')
      : '',
    '<tr>',
    hasGroupLabels ? '' : '<th scope="col"></th>',
    question.column_groups
      .flatMap((columnGroup) => columnGroup.columns)
      .map((column) => renderColumnHeading(column, indicatorIcon))
      .join(''),
    '</tr>',
    '</thead>',
  ].join('');
}

function renderGridRow({
  answers,
  columns,
  question,
  row,
}: {
  answers: AnswerLookup;
  columns: readonly GridColumnDescriptor[];
  question: GridQuestion;
  row: GridRow;
}): string {
  const rowAnswer = answers[getGridRowAnswerQuestionId(question.id, row.id)];

  return [
    `<tr data-row-id="${escapeHtml(row.id)}">`,
    `<th scope="row">${renderGridRowHeader(row, rowAnswer?.freeText ?? '')}</th>`,
    columns
      .map(({ column, columnGroup }) => {
        const selected =
          question.selection === 'single_per_group'
            ? answers[
                getGridGroupAnswerQuestionId(question.id, row.id, columnGroup.id)
              ]?.optionIds[0] === column.id
            : (rowAnswer?.optionIds ?? []).includes(column.id);

        return renderSelectionCell({
          column,
          mark: question.selection === 'single_per_group' ? '●' : '✓',
          selected,
        });
      })
      .join(''),
    '</tr>',
  ].join('');
}

function renderFlatTableHead(
  columns: readonly Column[],
  indicatorIcon: Section['indicator_icon'],
): string {
  return [
    '<thead>',
    '<tr>',
    '<th scope="col"></th>',
    columns.map((column) => renderColumnHeading(column, indicatorIcon)).join(''),
    '</tr>',
    '</thead>',
  ].join('');
}

function renderColumnHeading(column: Column, indicatorIcon: Section['indicator_icon']): string {
  return [
    '<th scope="col">',
    '<div class="column-heading">',
    renderWelfareDot(column.welfare_level, column.icon ?? indicatorIcon),
    `<span>${escapeHtml(column.label)}</span>`,
    renderTextBlock('option-detail', column.help),
    renderFlagBadges(column.flags),
    '</div>',
    '</th>',
  ].join('');
}

function renderSelectionCell({
  column,
  mark,
  selected,
}: {
  column: Column;
  mark: '●' | '✓';
  selected: boolean;
}): string {
  return [
    `<td class="${
      selected ? 'selection-cell selection-cell-selected' : 'selection-cell'
    }" data-column-id="${escapeHtml(column.id)}">`,
    `<span class="cell-mark">${selected ? escapeHtml(mark) : ''}</span>`,
    '</td>',
  ].join('');
}

function renderRowHeader(row: Row): string {
  return [
    `<span class="row-label">${escapeHtml(row.label)}</span>`,
    renderTextBlock('row-help', row.help),
    renderImageCaption(row.image_ref),
  ].join('');
}

function renderGridRowHeader(row: GridRow, answerText: string | null | undefined): string {
  return [
    `<span class="row-label">${escapeHtml(row.label)}</span>`,
    renderFlagBadges(row.flags ?? []),
    renderTextBlock('row-help', row.help),
    renderImageCaption(row.image_ref),
    row.allow_text ? renderInlineField(answerText) : '',
  ].join('');
}

function renderTextBlock(className: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).length === 0) {
    return '';
  }

  return `<p class="${className}">${escapeHtml(value)}</p>`;
}

function renderImageCaption(imageRef: string | null | undefined): string {
  if (!imageRef) {
    return '';
  }

  return `<p class="image-caption">${escapeHtml(t('assessment.imageReferenceCaption'))}</p>`;
}

function renderInlineField(value: string | null | undefined): string {
  return `<div class="inline-field">${escapeHtml(value ?? '')}</div>`;
}

function renderWelfareDot(
  welfareLevel: WelfareLevel | null,
  indicatorIcon: Section['indicator_icon'],
): string {
  if (welfareLevel === null) {
    return '<span class="welfare-dot welfare-dot-empty"></span>';
  }

  return `<span class="welfare-dot welfare-dot-${escapeHtml(
    indicatorIcon,
  )}" style="background:${welfareLevelColors[welfareLevel]}"></span>`;
}

function renderFlagBadges(flags: readonly OptionFlag[]): string {
  if (flags.length === 0) {
    return '';
  }

  return [
    '<span class="flag-list">',
    flags.map((flag) => `<span class="flag">${escapeHtml(flagText(flag))}</span>`).join(''),
    '</span>',
  ].join('');
}

function renderLegend(): string {
  const welfareLevels: WelfareLevel[] = [
    'optimal',
    'good',
    'moderate',
    'elevated_risk',
    'high_risk',
  ];
  const legendFlags: OptionFlag[] = [
    'dont_know',
    'vet_concern',
    'vet_urgent',
    'behaviour_urgent',
    'context_dependent',
  ];

  return [
    '<section class="legend">',
    `<h2 class="legend-title">${escapeHtml(t('assessment.legend.title'))}</h2>`,
    '<div class="legend-directions">',
    `<span class="legend-good">${escapeHtml(t('assessment.legend.goodDirection'))}</span>`,
    `<span class="legend-risk">${escapeHtml(t('assessment.legend.riskDirection'))}</span>`,
    '</div>',
    '<div class="legend-scale">',
    welfareLevels
      .map((level) =>
        [
          '<span class="legend-level">',
          `<span class="welfare-dot" style="background:${welfareLevelColors[level]}"></span>`,
          ` ${escapeHtml(t(`assessment.welfareLevelShort.${level}`))}`,
          '</span>',
        ].join(''),
      )
      .join(''),
    '</div>',
    `<p class="legend-ordering">${escapeHtml(t('assessment.legend.orderingNote'))}</p>`,
    `<h3 class="legend-markers-title">${escapeHtml(
      t('assessment.formReport.legendMarkersTitle'),
    )}</h3>`,
    '<div class="legend-flags">',
    legendFlags
      .map((flag) =>
        [
          '<div class="legend-flag-row">',
          `<span class="flag">${escapeHtml(flagText(flag))}</span>`,
          `<span class="legend-flag-definition">${escapeHtml(
            t(`assessment.flags.${flag}.definition`),
          )}</span>`,
          '</div>',
        ].join(''),
      )
      .join(''),
    '</div>',
    '</section>',
  ].join('');
}

function flagText(flag: OptionFlag): string {
  return withFlagGlyph(flag, t(`assessment.flags.${flag}.text`));
}

function getControlGlyph(control: 'radio' | 'checkbox', selected: boolean): string {
  if (control === 'radio') {
    return selected ? '●' : '○';
  }

  return selected ? '✓' : '□';
}

function renderStyles(): string {
  return `<style>
@page {
  size: A4;
  margin: 14mm 12mm 18mm;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: ${colors.paper};
  color: ${colors.text};
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  line-height: 1.35;
}
main {
  padding-bottom: 14mm;
}
.usage-notice {
  margin-top: 4mm;
  padding-top: 2mm;
  border-top: 1px solid ${colors.line};
  color: ${colors.textMuted};
  font-size: 7.2px;
  line-height: 1.25;
  break-inside: avoid;
  page-break-inside: avoid;
}
tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
.front-page {
  break-after: page;
}
.cover {
  min-height: 110mm;
  padding: 0 0 10mm;
}
.legend {
  margin: 4mm 0 0;
  padding: 4mm;
  border: 1px solid ${colors.lineStrong};
  break-inside: avoid;
}
.legend-title {
  margin: 0 0 3mm;
  color: ${colors.spruceInk};
  font-size: 14px;
}
.legend-directions {
  display: flex;
  justify-content: space-between;
  gap: 4mm;
  margin: 0 0 2mm;
  font-weight: 800;
}
.legend-good {
  color: ${colors.spruce};
}
.legend-risk {
  color: ${colors.danger};
}
.legend-scale {
  display: flex;
  gap: 4mm;
  margin: 0 0 2mm;
}
.legend-level {
  font-weight: 700;
}
.legend-ordering {
  margin: 0 0 3mm;
  color: ${colors.textMuted};
  font-style: italic;
}
.legend-markers-title {
  margin: 0 0 2mm;
  color: ${colors.spruceInk};
  font-size: 11.5px;
}
.legend-flags {
  display: grid;
  gap: 1.5mm;
}
.legend-flag-row {
  display: grid;
  grid-template-columns: 34mm 1fr;
  gap: 2mm;
  align-items: start;
}
.legend-flag-definition {
  color: ${colors.slate};
}
.cover-kicker {
  margin: 0 0 5mm;
  color: ${colors.spruceDark};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
}
h1 {
  margin: 0 0 5mm;
  color: ${colors.spruceInk};
  font-size: 30px;
  line-height: 1.1;
}
.developed-by {
  max-width: 170mm;
  margin: 0 0 10mm;
  color: ${colors.slate};
  font-size: 12px;
  line-height: 1.45;
}
.cover-meta {
  width: 100%;
  max-width: 150mm;
  margin: 0;
  border: 1px solid ${colors.lineStrong};
}
.meta-row {
  display: grid;
  grid-template-columns: 42mm 1fr;
  border-top: 1px solid ${colors.line};
}
.meta-row:first-child {
  border-top: 0;
}
dt,
dd {
  margin: 0;
  padding: 3mm;
}
dt {
  background: ${colors.mint};
  color: ${colors.spruceInk};
  font-weight: 800;
}
dd {
  color: ${colors.text};
}
.instrument-section {
  margin: 0 0 7mm;
  break-before: page;
}
.instrument-section h2 {
  margin: 0 0 4mm;
  padding: 3mm 4mm;
  background: ${colors.spruce};
  color: ${colors.paper};
  font-size: 16px;
  line-height: 1.25;
}
.question {
  margin: 0 0 4.5mm;
  padding: 3.2mm;
  border: 1px solid ${colors.line};
  break-inside: avoid;
}
.question-heading {
  display: grid;
  grid-template-columns: 12mm 1fr;
  gap: 2mm;
  align-items: start;
}
.question-number {
  color: ${colors.spruceDark};
  font-weight: 800;
}
h3 {
  margin: 0;
  color: ${colors.text};
  font-size: 12px;
  line-height: 1.35;
}
h4 {
  margin: 2mm 0;
  color: ${colors.spruceInk};
  font-size: 11.5px;
}
.help,
.note,
.option-detail,
.row-help,
.image-caption {
  margin: 1.5mm 0 0;
  color: ${colors.textMuted};
  white-space: pre-line;
}
.help {
  padding: 2mm;
  border-left: 2px solid ${colors.spruce};
  background: ${colors.help};
}
.note {
  font-style: italic;
}
.image-caption {
  display: inline-block;
  padding: 1mm 1.5mm;
  border: 1px dashed ${colors.lineStrong};
  background: ${colors.mintSoft};
  font-size: 10px;
}
.choice-list {
  margin: 2.5mm 0 0;
  padding: 0;
  list-style: none;
}
.choice-option {
  display: grid;
  grid-template-columns: 8mm 5mm 1fr;
  gap: 1.5mm;
  align-items: start;
  min-height: 10mm;
  margin: 0 0 1.4mm;
  padding: 1.8mm;
  border: 1px solid ${colors.line};
}
.choice-option-selected {
  border-color: ${colors.spruce};
  background: ${colors.mintSoft};
}
.control {
  color: ${colors.spruceDark};
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}
.choice-copy p {
  margin: 0;
}
.option-label,
.row-label {
  color: ${colors.text};
  font-weight: 700;
}
.flag-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 1mm;
  margin-top: 1mm;
  vertical-align: middle;
}
.flag {
  display: inline-block;
  padding: 0.5mm 1.4mm;
  border: 1px solid ${colors.lineStrong};
  border-radius: 99px;
  background: ${colors.mint};
  color: ${colors.spruceInk};
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}
.welfare-dot {
  display: inline-block;
  width: 3.3mm;
  height: 3.3mm;
  margin-top: 0.2mm;
  border: 1px solid ${colors.lineStrong};
  border-radius: 999px;
  vertical-align: middle;
}
.welfare-dot-empty {
  border-color: transparent;
  background: transparent;
}
.text-field,
.inline-field {
  min-height: 9mm;
  margin-top: 2mm;
  padding: 1.5mm 0.5mm 0;
  border-bottom: 1px solid ${colors.textMuted};
  color: ${colors.text};
  white-space: pre-wrap;
}
.text-field-multiline {
  min-height: 26mm;
  border: 1px solid ${colors.lineStrong};
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 6.5mm,
    ${colors.line} 6.6mm,
    transparent 6.8mm
  );
}
.inline-field {
  min-height: 7mm;
}
.table-block {
  margin-top: 2.5mm;
  overflow: hidden;
}
.form-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.form-table th,
.form-table td {
  border: 1px solid ${colors.lineStrong};
  padding: 1.6mm;
  vertical-align: top;
}
.form-table thead th {
  background: ${colors.mint};
  color: ${colors.spruceInk};
  font-size: 9.5px;
  font-weight: 800;
  text-align: center;
}
.form-table tbody th {
  width: 42mm;
  background: ${colors.mintSoft};
  text-align: left;
}
.column-group-heading {
  background: ${colors.spruce} !important;
  color: ${colors.paper} !important;
}
.column-heading {
  display: grid;
  gap: 1mm;
  justify-items: center;
}
.selection-cell {
  text-align: center;
}
.selection-cell-selected {
  background: ${colors.help};
}
.cell-mark {
  display: block;
  min-height: 4mm;
  color: ${colors.spruceDark};
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}
.cell-meta {
  display: grid;
  gap: 1mm;
  justify-items: center;
}
@media screen {
  body {
    background: ${colors.mintSoft};
  }
  main {
    max-width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 10mm 12mm 28mm;
    background: ${colors.paper};
    box-shadow: 0 8px 30px rgba(18, 49, 42, 0.12);
  }
}
</style>`;
}

