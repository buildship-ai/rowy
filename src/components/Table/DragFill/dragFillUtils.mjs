export function computeDragFillRowRange(startRowIndex, endRowIndex) {
  const start = Number(startRowIndex);
  const end = Number(endRowIndex);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) {
    return [];
  }
  if (end === start) return [];
  const step = end > start ? 1 : -1;
  const targets = [];
  for (let i = start + step; step > 0 ? i <= end : i >= end; i += step) {
    targets.push(i);
  }
  return targets;
}

export function cloneFillValueForField(sourceValue, fieldType, stepOffset = 0, numericStep = 0) {
  if (sourceValue === undefined || sourceValue === null) {
    return sourceValue;
  }
  const normalizedType = String(fieldType || 'SHORT_TEXT').toUpperCase();
  if (
    (normalizedType === 'NUMBER' || normalizedType === 'PERCENTAGE' || normalizedType === 'CURRENCY') &&
    typeof sourceValue === 'number' &&
    Number.isFinite(sourceValue)
  ) {
    return Number((sourceValue + stepOffset * numericStep).toFixed(6));
  }
  if (Array.isArray(sourceValue)) {
    return sourceValue.map((item) =>
      item && typeof item === 'object' ? { ...item } : item
    );
  }
  if (sourceValue instanceof Date) {
    return new Date(sourceValue.getTime());
  }
  if (typeof sourceValue === 'object') {
    return JSON.parse(JSON.stringify(sourceValue));
  }
  return sourceValue;
}

export function buildDragFillUpdates({
  rows,
  columnId,
  fieldType,
  isReadOnly = false,
  startRowIndex,
  endRowIndex,
  numericStep = 0,
}) {
  if (isReadOnly || !Array.isArray(rows) || !columnId) {
    return [];
  }
  const sourceRow = rows[startRowIndex];
  if (!sourceRow) return [];
  const sourceValue = sourceRow[columnId];
  const targetIndices = computeDragFillRowRange(startRowIndex, endRowIndex);

  return targetIndices
    .filter((idx) => idx >= 0 && idx < rows.length && rows[idx])
    .map((targetIdx, i) => ({
      rowId: rows[targetIdx]._rowy_ref?.path || rows[targetIdx].id,
      rowIndex: targetIdx,
      columnId,
      value: cloneFillValueForField(sourceValue, fieldType, i + 1, numericStep),
    }));
}
