module.exports = (sequelize, DataTypes) => {
    const Tenant = sequelize.define('Tenant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        firebase_tenant_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        company_size: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: DataTypes.STRING
        },
        address: {
            type: DataTypes.TEXT
        },
        logo_url: {
            type: DataTypes.STRING
        },
        subscription_plan: {
            type: DataTypes.ENUM('Free', 'Basic', 'Standard', 'Premium', 'Pro', 'Enterprise', 'Trial'),
            defaultValue: 'Free'
        },
        gstin: {
            type: DataTypes.STRING,
            allowNull: true
        },
        pan_number: {
            type: DataTypes.STRING,
            allowNull: true
        },
        subscription_status: {
            type: DataTypes.ENUM('Active', 'Inactive', 'Expired', 'Cancelled', 'Trial', 'pending'),
            defaultValue: 'pending'
        },
        subscription_expiry: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'tenants',
        timestamps: true
    });

    return Tenant;
};
