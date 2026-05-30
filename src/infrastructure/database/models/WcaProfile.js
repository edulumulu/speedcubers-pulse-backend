import { DataTypes, Model } from 'sequelize';

export class WcaProfile extends Model {
  static associate(models) {
    WcaProfile.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

export function initWcaProfile(sequelize) {
  WcaProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      wca_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
          is: /^[0-9]{4}[A-Z]{2,}[0-9]{2}$/,
        },
      },
      country_iso2: {
        type: DataTypes.STRING(2),
        allowNull: true,
      },
      synced_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'wca_profiles',
      modelName: 'WcaProfile',
      underscored: true,
      timestamps: false,
    },
  );

  return WcaProfile;
}
