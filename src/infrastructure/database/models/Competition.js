import { DataTypes, Model } from 'sequelize';

export class Competition extends Model {
  static associate(models) {
    Competition.belongsTo(models.User, { foreignKey: 'host_user_id', as: 'host' });
    Competition.belongsTo(models.User, { foreignKey: 'guest_user_id', as: 'guest' });
  }
}

export function defineCompetition(sequelize) {
  Competition.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true,
      },
      channel_name: {
        type: DataTypes.STRING(63),
        allowNull: false,
        unique: true,
      },
      event: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '3x3',
      },
      status: {
        type: DataTypes.ENUM('waiting', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'waiting',
      },
      host_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      guest_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'competitions',
      modelName: 'Competition',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return Competition;
}
