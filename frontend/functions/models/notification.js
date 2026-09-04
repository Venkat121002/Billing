module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('Info', 'Warning', 'Alert', 'Success'),
            defaultValue: 'Info'
        },
        target_audience: {
            type: DataTypes.ENUM('All', 'TenantAdmin', 'User'), // Who should see this?
            defaultValue: 'All'
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'notifications',
        timestamps: true
    });

    return Notification;
};
