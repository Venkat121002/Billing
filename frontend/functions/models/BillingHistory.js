module.exports = (sequelize, DataTypes) => {
    const BillingHistory = sequelize.define('BillingHistory', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        invoice_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        plan_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        billing_cycle: {
            type: DataTypes.STRING,
            defaultValue: 'Monthly'
        },
        status: {
            type: DataTypes.ENUM('Paid', 'Pending', 'Failed'),
            defaultValue: 'Paid'
        },
        invoice_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        pdf_url: {
            type: DataTypes.STRING
        },
        payment_id: {
            type: DataTypes.STRING
        }
    }, {
        tableName: 'billing_history',
        timestamps: true
    });

    return BillingHistory;
};
