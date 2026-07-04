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
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  question: MatrixQuestionContent;
  indicatorIcon: IndicatorIcon;
  selectedColumnIdForRow: (rowId: string) => string | null;
  onSelectColumn: (rowId: string, columnId: string) => void;
};

export function MatrixQuestion({
  question,
  indicatorIcon,
  selectedColumnIdForRow,
  onSelectColumn,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.image_ref ? <ImagePlaceholder /> : null}
      {question.row_groups.map((rowGroup, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          {rowGroup.rows.map((row) => (
            <MatrixRow
              columns={rowGroup.columns}
              indicatorIcon={indicatorIcon}
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
};

function MatrixRow({
  row,
  columns,
  indicatorIcon,
  selectedColumnId,
  onSelectColumn,
}: MatrixRowProps) {
  return (
    <View style={styles.rowCard}>
      <Text style={styles.rowLabel}>{row.label}</Text>
      {row.help ? <Text style={styles.rowHelp}>{row.help}</Text> : null}
      {row.image_ref ? <ImagePlaceholder /> : null}
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
                [row.label],
              )}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={column.id}
              onPress={() => onSelectColumn(row.id, column.id)}
              style={[styles.columnCard, selected ? styles.columnCardSelected : null]}
            >
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <IndicatorBadge
                indicatorIcon={indicatorIcon}
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
  group: {
    gap: 12,
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
