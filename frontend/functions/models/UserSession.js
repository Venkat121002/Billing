module.exports = (sequelize, DataTypes) => {
    const UserSession = sequelize.define('UserSession', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        login_time: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        logout_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        device_info: {
            type: DataTypes.STRING,
            allowNull: true
        },
        location_name: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'user_sessions',
        timestamps: true
    });

    return UserSession;
};
