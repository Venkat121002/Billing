module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
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
            allowNull: true // Superadmin or Tenant Admin might not be bound to a site
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        firebase_uid: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        firebase_tenant_id: {
            type: DataTypes.STRING,
            allowNull: true // Store the string ID "SwordNexBilling-4pzp8" here
        },
        subscription_status: {
            type: DataTypes.STRING,
            defaultValue: "pending"
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true
        },
        employee_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        job_title: {
            type: DataTypes.STRING,
            allowNull: true
        },
        discovery_source: {
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
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('Superadmin', 'TenantAdmin', 'User'),
            defaultValue: 'User'
        },
        permissions: {
            type: DataTypes.JSONB, // Store specific permissions as JSON
            defaultValue: {}
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            defaultValue: 'Active'
        },
        reset_password_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        reset_password_expires: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'users',
        timestamps: true
    });

    return User;
};
