module.exports = (sequelize, DataTypes) => {
    const Site = sequelize.define('Site', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        address: {
            type: DataTypes.TEXT
        },
        contact_email: {
            type: DataTypes.STRING
        },
        contact_phone: {
            type: DataTypes.STRING
        }
    }, {
        tableName: 'sites',
        timestamps: true
    });

    return Site;
};
