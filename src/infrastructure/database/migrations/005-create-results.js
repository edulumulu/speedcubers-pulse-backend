export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('competition_rounds', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    competition_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'competitions', key: 'id' },
      onDelete: 'CASCADE',
    },
    round_number: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    scramble: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('active', 'completed'),
      allowNull: false,
      defaultValue: 'active',
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

  await queryInterface.addIndex('competition_rounds', ['competition_id', 'round_number'], {
    name: 'idx_competition_rounds_competition_number_unique',
    unique: true,
  });
  await queryInterface.addIndex('competition_rounds', ['competition_id', 'status'], {
    name: 'idx_competition_rounds_competition_status',
  });

  await queryInterface.createTable('results', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    round_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'competition_rounds', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    time_ms: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    penalty: {
      type: Sequelize.ENUM('none', '+2', 'dnf'),
      allowNull: false,
      defaultValue: 'none',
    },
    final_time_ms: {
      type: Sequelize.INTEGER,
      allowNull: true,
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

  await queryInterface.addIndex('results', ['round_id', 'user_id'], {
    name: 'idx_results_round_user_unique',
    unique: true,
  });
  await queryInterface.addIndex('results', ['round_id'], { name: 'idx_results_round_id' });
  await queryInterface.addIndex('results', ['user_id'], { name: 'idx_results_user_id' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('results');
  await queryInterface.dropTable('competition_rounds');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_results_penalty";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_competition_rounds_status";');
}
