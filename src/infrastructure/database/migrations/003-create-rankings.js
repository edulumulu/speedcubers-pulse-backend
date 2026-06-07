export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('rankings', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    elo: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1000,
    },
    wins: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    losses: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    dnf_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_matches: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    pb_time: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    average_time: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('rankings', ['elo'], {
    name: 'idx_rankings_elo',
    order: 'DESC',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('rankings');
}
