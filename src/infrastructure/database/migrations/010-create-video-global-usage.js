export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('video_global_usage', {
    month_start: {
      type: Sequelize.DATE,
      allowNull: false,
      primaryKey: true,
    },
    seconds_used: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reset_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('video_global_usage');
}
