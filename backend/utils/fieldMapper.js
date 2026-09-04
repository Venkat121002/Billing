exports.mapFields = (rawData, mapping) => {
    return rawData.map(row => {
        const mappedRow = {};
        Object.entries(mapping).forEach(([dbField, excelCol]) => {
            if (excelCol) {
                mappedRow[dbField] = row[excelCol];
            }
        });
        return mappedRow;
    });
};