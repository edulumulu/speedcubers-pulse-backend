import { DataTypes, Model } from 'sequelize';

export class VideoGlobalUsage extends Model {}

export function defineVideoGlobalUsage(sequelize) {
  VideoGlobalUsage.init(
    {
      month_start: {
        type: DataTypes.DATE,
        allowNull: false,
        primaryKey: true,
      },
      seconds_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reset_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'video_global_usage',
      modelName: 'VideoGlobalUsage',
      underscored: true,
    },
  );

  return VideoGlobalUsage;
}
