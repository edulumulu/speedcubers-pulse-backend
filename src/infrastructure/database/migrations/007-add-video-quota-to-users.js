export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'video_seconds_used', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addColumn('users', 'video_quota_reset_at', {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('users', 'video_quota_reset_at');
  await queryInterface.removeColumn('users', 'video_seconds_used');
}
