import { DataTypes, Model } from 'sequelize';

export class Result extends Model {
  static associate(models) {
    Result.belongsTo(models.CompetitionRound, { foreignKey: 'round_id', as: 'round' });
    Result.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

export function defineResult(sequelize) {
  Result.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      round_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      penalty: {
        type: DataTypes.ENUM('none', '+2', 'dnf'),
        allowNull: false,
        defaultValue: 'none',
      },
      final_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'results',
      modelName: 'Result',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['round_id', 'user_id'],
        },
      ],
    },
  );
  return Result;
}
