const assert = require('node:assert/strict');
const { test } = require('node:test');
const XLSX = require('xlsx');

const { buildWorkbook, sheetName } = require('../utils/excelExport');

const read = (buf) => XLSX.read(buf, { type: 'buffer' });

test('one sheet per non-empty list, with id first and nested values as JSON', () => {
  const wb = read(buildWorkbook([
    { label: 'Products', records: [{ name: 'Pen', _id: 'p1', price: 10, tags: ['a', 'b'], dims: { w: 1 }, _path: 'owner/o1/products/p1' }] },
    { label: 'Customers', records: [] },
  ]));
  assert.deepEqual(wb.SheetNames, ['Products']);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Products, { header: 1 });
  assert.deepEqual(rows[0], ['id', 'name', 'price', 'tags', 'dims']);
  assert.deepEqual(rows[1], ['p1', 'Pen', 10, 'a, b', '{"w":1}']);
});

test('rows with different fields share one header row', () => {
  const wb = read(buildWorkbook([{ label: 'Bills', records: [{ _id: 'a', total: 1 }, { _id: 'b', note: 'x' }] }]));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Bills, { defval: '' });
  assert.deepEqual(rows, [{ id: 'a', total: 1, note: '' }, { id: 'b', total: '', note: 'x' }]);
});

test('sheet names are valid and unique; an all-empty export still opens', () => {
  const taken = new Set();
  assert.equal(sheetName('Dues & credit', taken), 'Dues & credit');
  assert.equal(sheetName('dues & credit', taken), 'dues & credit 2');
  assert.equal(sheetName('A/B:C?', new Set()), 'A B C');
  assert.equal(sheetName('x'.repeat(50), new Set()).length, 31);
  assert.deepEqual(read(buildWorkbook([{ label: 'Products', records: [] }])).SheetNames, ['No data']);
});

test('very long text is cut below Excel\'s cell limit', () => {
  const wb = read(buildWorkbook([{ label: 'Notes', records: [{ body: 'x'.repeat(40000) }] }]));
  assert.ok(XLSX.utils.sheet_to_json(wb.Sheets.Notes)[0].body.length <= 32000);
});
