/**
 * Turns record lists into an .xlsx workbook: one sheet per list, one column per field.
 * Nested values (objects, arrays of objects) are written as JSON text so nothing is lost.
 */
const XLSX = require('xlsx');

const MAX_CELL = 32000; // Excel's hard limit is 32,767 characters per cell
const INVALID_SHEET_CHARS = /[\\/?*[\]:]/g;

// Fields that are bookkeeping for the console, not store data.
const HIDDEN_FIELDS = new Set(['_path', '_storeId', '_storeName', '_name', '_ref', '_note', '_device']);

function cell(value) {
    if (value === undefined || value === null) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        if (Array.isArray(value) && value.every((v) => v === null || typeof v !== 'object')) return value.join(', ');
        return JSON.stringify(value).slice(0, MAX_CELL);
    }
    return typeof value === 'string' ? value.slice(0, MAX_CELL) : value;
}

/** Plain row objects -> [{header: cellValue}], with _id shown as "id" and first. */
function flattenRows(records) {
    const headers = [];
    const seen = new Set();
    const note = (h) => { if (!seen.has(h)) { seen.add(h); headers.push(h); } };
    const rows = records.map((rec) => {
        const row = {};
        for (const [key, value] of Object.entries(rec)) {
            if (HIDDEN_FIELDS.has(key)) continue;
            const header = key === '_id' ? 'id' : key;
            note(header);
            row[header] = cell(value);
        }
        return row;
    });
    headers.sort((a, b) => (a === 'id' ? -1 : b === 'id' ? 1 : 0));
    return { headers, rows };
}

// Sheet names: max 31 chars, none of \ / ? * [ ] :, unique case-insensitively.
function sheetName(label, taken) {
    const base = String(label).replace(INVALID_SHEET_CHARS, ' ').trim().slice(0, 31) || 'Sheet';
    let name = base;
    for (let i = 2; taken.has(name.toLowerCase()); i += 1) name = `${base.slice(0, 28)} ${i}`;
    taken.add(name.toLowerCase());
    return name;
}

/**
 * @param {Array<{label: string, records: object[]}>} sheets  empty ones are skipped
 * @returns {Buffer} the .xlsx file
 */
function buildWorkbook(sheets) {
    const wb = XLSX.utils.book_new();
    const taken = new Set();
    for (const { label, records } of sheets) {
        if (!records.length) continue;
        const { headers, rows } = flattenRows(records);
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
        ws['!cols'] = headers.map((h) => ({ wch: Math.min(40, Math.max(10, h.length + 2)) }));
        XLSX.utils.book_append_sheet(wb, ws, sheetName(label, taken));
    }
    if (!wb.SheetNames.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'No data');
    }
    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

module.exports = { buildWorkbook, flattenRows, sheetName };
