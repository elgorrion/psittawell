import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  Column,
  ColumnGroup,
  GridQuestion as GridQuestionContent,
  GridRow,
  IndicatorIcon,
} from '../../content/schema';
import { t } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  question: GridQuestionContent;
  indicatorIcon: IndicatorIcon;
  selectedColumnIdsForRow: (rowId: string) => string[];
  selectedColumnIdForGroup: (rowId: string, groupId: string) => string | null;
  rowTextForRow: (rowId: string) => string;
  onToggleColumn: (rowId: string, columnId: string) => void;
  onSelectColumn: (rowId: string, groupId: string, columnId: string) => void;
  onChangeRowText: (rowId: string, value: string) => void;
  disabled?: boolean;
};

export function GridQuestion({
  question,
  indicatorIcon,
  selectedColumnIdsForRow,
  selectedColumnIdForGroup,
  rowTextForRow,
  onToggleColumn,
  onSelectColumn,
  onChangeRowText,
  disabled = false,
}: Props) {
  const showsGroupLabels = question.column_groups.length > 1;
  const hasIndicators = question.column_groups.some((group) =>
    group.columns.some((column) => column.welfare_level !== null),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.note ? <Text style={styles.note}>{question.note}</Text> : null}
      {question.image_ref ? <ImagePlaceholder /> : null}
      <View style={styles.rows}>
        {question.rows.map((row) => (
          <GridRowCard
            disabled={disabled}
            indicatorIcon={indicatorIcon}
            key={row.id}
            onChangeRowText={onChangeRowText}
            onSelectColumn={onSelectColumn}
            onToggleColumn={onToggleColumn}
            question={question}
            row={row}
            rowText={rowTextForRow(row.id)}
            selectedColumnIdForGroup={selectedColumnIdForGroup}
            hasIndicators={hasIndicators}
            selectedColumnIds={selectedColumnIdsForRow(row.id)}
            showsGroupLabels={showsGroupLabels}
          />
        ))}
      </View>
    </View>
  );
}

type GridRowCardProps = {
  question: GridQuestionContent;
  row: GridRow;
  indicatorIcon: IndicatorIcon;
  selectedColumnIds: string[];
  selectedColumnIdForGroup: (rowId: string, groupId: string) => string | null;
  rowText: string;
  onToggleColumn: (rowId: string, columnId: string) => void;
  onSelectColumn: (rowId: string, groupId: string, columnId: string) => void;
  onChangeRowText: (rowId: string, value: string) => void;
  showsGroupLabels: boolean;
  hasIndicators: boolean;
  disabled: boolean;
};

function GridRowCard({
  question,
  row,
  indicatorIcon,
  selectedColumnIds,
  selectedColumnIdForGroup,
  rowText,
  onToggleColumn,
  onSelectColumn,
  onChangeRowText,
  showsGroupLabels,
  hasIndicators,
  disabled,
}: GridRowCardProps) {
  const selectedColumns = new Set(selectedColumnIds);
  const showRowTextInput = question.selection === 'multi' && row.allow_text && selectedColumnIds.length > 0;

  return (
    <View style={styles.rowCard}>
      <Text style={styles.rowLabel}>{row.label}</Text>
      {row.help ? <Text style={styles.rowHelp}>{row.help}</Text> : null}
      {row.image_ref ? <ImagePlaceholder /> : null}
      {question.column_groups.map((columnGroup) => (
        <ColumnGroupOptions
          columnGroup={columnGroup}
          disabled={disabled}
          indicatorIcon={indicatorIcon}
          key={columnGroup.id}
          onSelectColumn={onSelectColumn}
          onToggleColumn={onToggleColumn}
          question={question}
          row={row}
          selectedColumnId={selectedColumnIdForGroup(row.id, columnGroup.id)}
          hasIndicators={hasIndicators}
          selectedColumns={selectedColumns}
          showsGroupLabel={showsGroupLabels}
        />
      ))}
      {showRowTextInput ? (
        <TextInput
          accessibilityLabel={row.label}
          editable={!disabled}
          onChangeText={(value) => onChangeRowText(row.id, value)}
          style={[styles.rowTextInput, disabled ? styles.rowTextInputDisabled : null]}
          value={rowText}
        />
      ) : null}
    </View>
  );
}

type ColumnGroupOptionsProps = {
  question: GridQuestionContent;
  row: GridRow;
  columnGroup: ColumnGroup;
  indicatorIcon: IndicatorIcon;
  selectedColumns: Set<string>;
  selectedColumnId: string | null;
  onToggleColumn: (rowId: string, columnId: string) => void;
  onSelectColumn: (rowId: string, groupId: string, columnId: string) => void;
  showsGroupLabel: boolean;
  hasIndicators: boolean;
  disabled: boolean;
};

function ColumnGroupOptions({
  question,
  row,
  columnGroup,
  indicatorIcon,
  selectedColumns,
  selectedColumnId,
  onToggleColumn,
  onSelectColumn,
  showsGroupLabel,
  hasIndicators,
  disabled,
}: ColumnGroupOptionsProps) {
  const accessibilityLabel =
    columnGroup.label.length > 0
      ? t('assessment.gridGroupAccessibility', { row: row.label, group: columnGroup.label })
      : t('assessment.matrixRowAccessibility', { row: row.label });

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={question.selection === 'single_per_group' ? 'radiogroup' : undefined}
      style={styles.columnGroup}
    >
      {showsGroupLabel && columnGroup.label.length > 0 ? (
        <Text style={styles.groupLabel}>{columnGroup.label}</Text>
      ) : null}
      {columnGroup.help ? <Text style={styles.groupHelp}>{columnGroup.help}</Text> : null}
      <View style={styles.columnOptions}>
        {columnGroup.columns.map((column) => {
          const selected =
            question.selection === 'single_per_group'
              ? selectedColumnId === column.id
              : selectedColumns.has(column.id);

          return (
            <GridColumnOption
              column={column}
              columnGroup={columnGroup}
              disabled={disabled}
              hasIndicators={hasIndicators}
              indicatorIcon={indicatorIcon}
              key={column.id}
              onPress={() => {
                if (question.selection === 'single_per_group') {
                  onSelectColumn(row.id, columnGroup.id, column.id);
                } else {
                  onToggleColumn(row.id, column.id);
                }
              }}
              row={row}
              selected={selected}
              selection={question.selection}
            />
          );
        })}
      </View>
    </View>
  );
}

type GridColumnOptionProps = {
  row: GridRow;
  columnGroup: ColumnGroup;
  column: Column;
  indicatorIcon: IndicatorIcon;
  selection: GridQuestionContent['selection'];
  selected: boolean;
  onPress: () => void;
  hasIndicators: boolean;
  disabled: boolean;
};

function GridColumnOption({
  row,
  columnGroup,
  column,
  indicatorIcon,
  selection,
  selected,
  onPress,
  hasIndicators,
  disabled,
}: GridColumnOptionProps) {
  const accessibilityParts = columnGroup.label.length > 0
    ? [row.label, columnGroup.label]
    : [row.label];

  return (
    <Pressable
      accessibilityLabel={getChoiceAccessibilityLabel(
        column.label,
        column.welfare_level,
        column.flags,
        accessibilityParts,
      )}
      accessibilityRole={selection === 'single_per_group' ? 'radio' : 'checkbox'}
      accessibilityState={
        selection === 'single_per_group'
          ? { disabled, selected }
          : { checked: selected, disabled }
      }
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.columnCard,
        selected ? styles.columnCardSelected : null,
        disabled ? styles.columnCardDisabled : null,
      ]}
    >
      <View
        style={[
          styles.selectionControl,
          selection === 'single_per_group' ? styles.radio : styles.checkbox,
          selected ? styles.controlSelected : null,
        ]}
      >
        {selected ? (
          <View
            style={selection === 'single_per_group' ? styles.radioDot : styles.checkboxMark}
          />
        ) : null}
      </View>
      <IndicatorBadge
        indicatorIcon={indicatorIcon}
        reserveSpace={hasIndicators}
        welfareLevel={column.welfare_level}
      />
      <View style={styles.columnContent}>
        <Text style={styles.columnLabel}>{column.label}</Text>
        {column.help ? <Text style={styles.columnHelp}>{column.help}</Text> : null}
        <FlagBadges flags={column.flags} />
      </View>
    </Pressable>
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
  note: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  rows: {
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
  columnGroup: {
    gap: 8,
  },
  groupLabel: {
    color: colors.spruceInk,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  groupHelp: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
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
    borderRadius: 9,
  },
  checkbox: {
    borderRadius: 3,
  },
  selectionControl: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    marginTop: 2,
    width: 18,
  },
  radioDot: {
    backgroundColor: colors.spruce,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  checkboxMark: {
    backgroundColor: colors.spruce,
    borderRadius: 2,
    height: 10,
    width: 10,
  },
  controlSelected: {
    borderColor: colors.spruce,
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
  columnHelp: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  rowTextInput: {
    backgroundColor: colors.paper,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  rowTextInputDisabled: {
    backgroundColor: colors.mint,
    color: colors.textMuted,
  },
});
