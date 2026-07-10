export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('rankings', 'event', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: '3x3',
  });

  await queryInterface.sequelize.query('ALTER TABLE rankings DROP CONSTRAINT IF EXISTS rankings_user_id_key;');
  await queryInterface.addIndex('rankings', ['user_id', 'event'], {
    name: 'idx_rankings_user_event_unique',
    unique: true,
  });
  await queryInterface.addIndex('rankings', ['event', 'elo'], {
    name: 'idx_rankings_event_elo',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('rankings', 'idx_rankings_event_elo');
  await queryInterface.removeIndex('rankings', 'idx_rankings_user_event_unique');
  await queryInterface.sequelize.query('DELETE FROM rankings WHERE event <> \'3x3\';');
  await queryInterface.removeColumn('rankings', 'event');
  await queryInterface.addConstraint('rankings', {
    fields: ['user_id'],
    type: 'unique',
    name: 'rankings_user_id_key',
  });
}
