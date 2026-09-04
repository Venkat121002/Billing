const XLSX = require('xlsx');

exports.parseExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(worksheet);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    return { headers, rows };
};