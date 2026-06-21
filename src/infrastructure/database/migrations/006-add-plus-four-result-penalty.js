export async function up(queryInterface) {
  await queryInterface.sequelize.query('ALTER TYPE "enum_results_penalty" ADD VALUE IF NOT EXISTS \'+4\';');
}

export async function down() {
}
