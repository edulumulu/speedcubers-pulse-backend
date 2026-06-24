import { DataTypes, Model } from 'sequelize';

export class CompetitionRound extends Model {
  static associate(models) {
    CompetitionRound.belongsTo(models.Competition, { foreignKey: 'competition_id', as: 'competition' });
    CompetitionRound.hasMany(models.Result, { foreignKey: 'round_id', as: 'results' });
  }
}

export function defineCompetitionRound(sequelize) {
  CompetitionRound.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      competition_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      round_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      scramble: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'completed'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      tableName: 'competition_rounds',
      modelName: 'CompetitionRound',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['competition_id', 'round_number'],
        },
      ],
    },
  );
  return CompetitionRound;
}
