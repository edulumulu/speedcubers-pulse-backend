export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('competitions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: Sequelize.STRING(8),
      allowNull: false,
      unique: true,
    },
    channel_name: {
      type: Sequelize.STRING(63),
      allowNull: false,
      unique: true,
    },
    event: {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: '3x3',
    },
    status: {
      type: Sequelize.ENUM('waiting', 'active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'waiting',
    },
    host_user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    guest_user_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('competitions', ['code'], { name: 'idx_competitions_code' });
  await queryInterface.addIndex('competitions', ['status'], { name: 'idx_competitions_status' });
  await queryInterface.addIndex('competitions', ['host_user_id'], { name: 'idx_competitions_host_user_id' });
  await queryInterface.addIndex('competitions', ['guest_user_id'], { name: 'idx_competitions_guest_user_id' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('competitions');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_competitions_status";');
}
