export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('wca_profiles', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    wca_id: {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
    },
    country_iso2: {
      type: Sequelize.STRING(2),
      allowNull: true,
    },
    synced_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('wca_profiles', ['wca_id']);
  await queryInterface.addIndex('wca_profiles', ['user_id']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('wca_profiles');
}
