module.exports = (sequelize, DataTypes) => {
    const Invoice = sequelize.define('Invoice', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        site_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        invoice_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        customer_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Draft', 'Sent', 'Paid', 'Overdue'),
            defaultValue: 'Draft'
        },
        due_date: {
            type: DataTypes.DATE
        },
        pdf_url: {
            type: DataTypes.STRING
        }
    }, {
        tableName: 'invoices',
        timestamps: true
    });

    return Invoice;
};
