import { DataTypes, Model } from 'sequelize';

export class User extends Model {
  static associate(models) {
    User.hasOne(models.WcaProfile, { foreignKey: 'user_id', as: 'wcaProfile' });
    User.hasMany(models.Ranking, { foreignKey: 'user_id', as: 'rankings' });
    User.hasMany(models.Competition, { foreignKey: 'host_user_id', as: 'hostedCompetitions' });
    User.hasMany(models.Competition, { foreignKey: 'guest_user_id', as: 'joinedCompetitions' });
    User.hasMany(models.Result, { foreignKey: 'user_id', as: 'results' });
  }
}

export function initUser(sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [2, 20],
          is: /^[a-zA-Z0-9_-]+$/,
        },
      },
      username_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      video_seconds_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      video_quota_reset_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'users',
      modelName: 'User',
      underscored: true,
      paranoid: true,
      deletedAt: 'deleted_at',
    },
  );

  return User;
}
