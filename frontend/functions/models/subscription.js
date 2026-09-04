module.exports = (sequelize, DataTypes) => {
    const Subscription = sequelize.define('Subscription', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        plan_type: {
            type: DataTypes.ENUM('Free', 'Basic', 'Pro', 'Enterprise'),
            allowNull: false
        },
        billing_cycle: {
            type: DataTypes.ENUM('Monthly', 'Yearly'),
            defaultValue: 'Monthly'
        },
        stripe_subscription_id: {
            type: DataTypes.STRING
        },
        stripe_customer_id: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM('Active', 'PastDue', 'Canceled', 'Incomplete'),
            defaultValue: 'Active'
        },
        start_date: {
            type: DataTypes.DATE
        },
        end_date: {
            type: DataTypes.DATE
        },
        next_billing_date: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'subscriptions',
        timestamps: true
    });

    return Subscription;
};
