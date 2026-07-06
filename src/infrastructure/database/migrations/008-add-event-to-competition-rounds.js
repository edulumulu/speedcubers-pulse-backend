export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('competition_rounds', 'event', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: '3x3',
  });

  await queryInterface.sequelize.query(`
    UPDATE competition_rounds AS rounds
    SET event = competitions.event
    FROM competitions
    WHERE rounds.competition_id = competitions.id
  `);
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('competition_rounds', 'event');
}
