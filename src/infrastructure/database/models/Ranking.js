import { DataTypes, Model } from 'sequelize';

export class Ranking extends Model {
  static associate(models) {
    Ranking.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

export function defineRanking(sequelize) {
  Ranking.init(
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
      event: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '3x3',
      },
      elo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1000,
      },
      wins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      losses: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      dnf_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_matches: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pb_time: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      average_time: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'rankings',
      modelName: 'Ranking',
      underscored: true,
      timestamps: true,
      createdAt: false,
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'event'],
        },
        {
          fields: ['event', 'elo'],
        },
      ],
    },
  );
  return Ranking;
}
