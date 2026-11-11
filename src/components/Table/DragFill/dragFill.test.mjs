import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDragFillUpdates,
  cloneFillValueForField,
  computeDragFillRowRange,
} from './dragFillUtils.mjs';

test('computeDragFillRowRange calculates downward and upward target row indices', () => {
  assert.deepEqual(computeDragFillRowRange(1, 4), [2, 3, 4]);
  assert.deepEqual(computeDragFillRowRange(4, 2), [3, 2]);
  assert.deepEqual(computeDragFillRowRange(2, 2), []);
});

test('buildDragFillUpdates copies Text, Number, and MultiSelect values to dragged rows', () => {
  const rows = [
    { id: 'row-0', title: 'Alpha', price: 100, tags: ['urgent', 'q4'] },
    { id: 'row-1', title: '', price: 0, tags: [] },
    { id: 'row-2', title: '', price: 0, tags: [] },
    { id: 'row-3', title: '', price: 0, tags: [] },
  ];

  const textUpdates = buildDragFillUpdates({
    rows,
    columnId: 'title',
    fieldType: 'SHORT_TEXT',
    startRowIndex: 0,
    endRowIndex: 3,
  });
  assert.equal(textUpdates.length, 3);
  assert.deepEqual(
    textUpdates.map((u) => ({ rowId: u.rowId, value: u.value })),
    [
      { rowId: 'row-1', value: 'Alpha' },
      { rowId: 'row-2', value: 'Alpha' },
      { rowId: 'row-3', value: 'Alpha' },
    ]
  );

  const numberSeriesUpdates = buildDragFillUpdates({
    rows,
    columnId: 'price',
    fieldType: 'NUMBER',
    startRowIndex: 0,
    endRowIndex: 2,
    numericStep: 25,
  });
  assert.deepEqual(
    numberSeriesUpdates.map((u) => u.value),
    [125, 150]
  );
});

test('buildDragFillUpdates skips read-only columns and deep-clones array/object values', () => {
  const rows = [
    { id: 'r0', tags: [{ label: 'v1' }] },
    { id: 'r1', tags: [] },
  ];
  const blocked = buildDragFillUpdates({
    rows,
    columnId: 'tags',
    fieldType: 'MULTI_SELECT',
    isReadOnly: true,
    startRowIndex: 0,
    endRowIndex: 1,
  });
  assert.equal(blocked.length, 0);

  const cloned = cloneFillValueForField(rows[0].tags, 'MULTI_SELECT');
  assert.deepEqual(cloned, [{ label: 'v1' }]);
  assert.notEqual(cloned[0], rows[0].tags[0]);
});
