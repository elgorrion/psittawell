import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  Column,
  IndicatorIcon,
  MatrixQuestion as MatrixQuestionContent,
  Row,
} from '../../content/schema';
import { t } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { InstrumentImage } from './InstrumentImage';

type Props = {
  question: MatrixQuestionContent;
  indicatorIcon: IndicatorIcon;
  selectedColumnIdForRow: (rowId: string) => string | null;
  onSelectColumn: (rowId: string, columnId: string) => void;
  disabled?: boolean;
};

export function MatrixQuestion({
  question,
  indicatorIcon,
  selectedColumnIdForRow,
  onSelectColumn,
  disabled = false,
}: Props) {
  const columnHelpDefinitions = getColumnHelpDefinitions(question);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      <FlagBadges flags={question.flags ?? []} />
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.note ? <Text style={styles.note}>{question.note}</Text> : null}
      {question.image_ref ? <InstrumentImage imageRef={question.image_ref} /> : null}
      {columnHelpDefinitions.length > 0 ? (
        <View style={styles.columnDefinitions}>
          {columnHelpDefinitions.map((definition) => (
            <View key={definition.id} style={styles.columnDefinitionLine}>
              <Text style={[styles.columnDefinitionText, styles.columnDefinitionLabel]}>
                {definition.label}
              </Text>
              <Text style={styles.columnDefinitionText}>{definition.help}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {question.row_groups.map((rowGroup, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          {rowGroup.label ? <Text style={styles.groupLabel}>{rowGroup.label}</Text> : null}
          {rowGroup.rows.map((row) => (
            <MatrixRow
              columns={rowGroup.columns}
              indicatorIcon={indicatorIcon}
              disabled={disabled}
              key={row.id}
              onSelectColumn={onSelectColumn}
              row={row}
              selectedColumnId={selectedColumnIdForRow(row.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type MatrixRowProps = {
  row: Row;
  columns: Column[];
  indicatorIcon: IndicatorIcon;
  selectedColumnId: string | null;
  onSelectColumn: (rowId: string, columnId: string) => void;
  disabled: boolean;
};

function MatrixRow({
  row,
  columns,
  indicatorIcon,
  selectedColumnId,
  onSelectColumn,
  disabled,
}: MatrixRowProps) {
  const hasIndicators = columns.some((column) => column.welfare_level !== null);

  return (
    <View style={styles.rowCard}>
      <Text style={styles.rowLabel}>{row.label}</Text>
      {row.help ? <Text style={styles.rowHelp}>{row.help}</Text> : null}
      {row.image_ref ? <InstrumentImage imageRef={row.image_ref} /> : null}
      <View
        accessibilityLabel={t('assessment.matrixRowAccessibility', { row: row.label })}
        accessibilityRole="radiogroup"
        style={styles.columnOptions}
      >
        {columns.map((column) => {
          const selected = selectedColumnId === column.id;

          return (
            <Pressable
              accessibilityLabel={getChoiceAccessibilityLabel(
                column.label,
                column.welfare_level,
                column.flags,
                [column.help ?? '', row.label],
              )}
              accessibilityRole="radio"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={column.id}
              onPress={() => onSelectColumn(row.id, column.id)}
              style={[
                styles.columnCard,
                selected ? styles.columnCardSelected : null,
                disabled ? styles.columnCardDisabled : null,
              ]}
            >
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <IndicatorBadge
                indicatorIcon={indicatorIcon}
                reserveSpace={hasIndicators}
                welfareLevel={column.welfare_level}
              />
              <View style={styles.columnContent}>
                <Text style={styles.columnLabel}>{column.label}</Text>
                <FlagBadges flags={column.flags} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getColumnHelpDefinitions(question: MatrixQuestionContent) {
  const seen = new Set<string>();
  const definitions: { id: string; label: string; help: string }[] = [];

  for (const rowGroup of question.row_groups) {
    for (const column of rowGroup.columns) {
      if (!column.help) {
        continue;
      }

      const key = JSON.stringify([column.label, column.help]);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      definitions.push({
        id: `${column.id}:${definitions.length}`,
        label: column.label,
        help: column.help,
      });
    }
  }

  return definitions;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  prompt: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  help: {
    backgroundColor: colors.help,
    borderLeftColor: colors.spruce,
    borderLeftWidth: 3,
    borderRadius: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  columnDefinitions: {
    gap: 6,
  },
  columnDefinitionLine: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  columnDefinitionText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  columnDefinitionLabel: {
    fontWeight: '800',
  },
  group: {
    gap: 12,
  },
  groupLabel: {
    color: colors.spruceInk,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  rowCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  rowHelp: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  columnOptions: {
    gap: 8,
  },
  columnCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    padding: 10,
  },
  columnCardSelected: {
    borderColor: colors.spruce,
  },
  columnCardDisabled: {
    backgroundColor: colors.mint,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    marginTop: 2,
    width: 18,
  },
  radioSelected: {
    borderColor: colors.spruce,
  },
  radioDot: {
    backgroundColor: colors.spruce,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  columnContent: {
    flex: 1,
    flexShrink: 1,
  },
  columnLabel: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
