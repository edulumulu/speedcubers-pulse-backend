import { v4 as uuidv4 } from 'uuid';

// bcrypt hash of 'Abcd1234' with 12 salt rounds
const PASSWORD_HASH = '$2b$12$yvCzNx8CmLfL4399egeWnuNFkbc2ifuOeAWHdbpmO5jD.NVYrPILu';

const users = [
  {
    id: 'aaaaaaaa-0001-0001-0001-000000000001',
    email: 'eduardo@speedcubers.dev',
    username: 'edulumulu',
    wca_id: '2022LUCA04',
    country_iso2: 'ES',
  },
  {
    id: 'aaaaaaaa-0002-0002-0002-000000000002',
    email: 'margallego@speedcubers.dev',
    username: 'margallego',
    wca_id: '2013VICE01',
    country_iso2: 'ES',
  },
  {
    id: 'aaaaaaaa-0003-0003-0003-000000000003',
    email: 'cuber3@speedcubers.dev',
    username: 'fastcuber',
    wca_id: null,
    country_iso2: null,
  },
  {
    id: 'aaaaaaaa-0004-0004-0004-000000000004',
    email: 'cuber4@speedcubers.dev',
    username: 'speedmaster',
    wca_id: null,
    country_iso2: null,
  },
];

export async function up(queryInterface) {
  const now = new Date();

  await queryInterface.bulkInsert('users', users.map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    password_hash: PASSWORD_HASH,
    username_changed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  })));

  const wcaUsers = users.filter(u => u.wca_id);
  if (wcaUsers.length) {
    await queryInterface.bulkInsert('wca_profiles', wcaUsers.map(u => ({
      id: uuidv4(),
      user_id: u.id,
      wca_id: u.wca_id,
      country_iso2: u.country_iso2,
      synced_at: now,
    })));
  }
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete('wca_profiles', {
    user_id: users.filter(u => u.wca_id).map(u => u.id),
  });
  await queryInterface.bulkDelete('users', {
    id: users.map(u => u.id),
  });
}
