import { v4 as uuidv4 } from 'uuid';

// bcrypt hash of 'Abcd1234' with 12 salt rounds
const PASSWORD_HASH = '$2b$12$yvCzNx8CmLfL4399egeWnuNFkbc2ifuOeAWHdbpmO5jD.NVYrPILu';

const users = [
  { id: 'aaaaaaaa-0001-0001-0001-000000000001', email: 'edu@edu.com', username: 'edulumulu',  wca_id: '2022LUCA04', country_iso2: 'ES' },
  { id: 'aaaaaaaa-0002-0002-0002-000000000002', email: 'mar@mar.com', username: 'margallego', wca_id: '2013VICE01', country_iso2: 'ES' },
  { id: 'aaaaaaaa-0003-0003-0003-000000000003', email: 'fas@fas.com', username: 'fastcuber',  wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0004-0004-0004-000000000004', email: 'spe@spe.com', username: 'speedmaster', wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0005-0005-0005-000000000005', email: 'ali@ali.com', username: 'alicuber',   wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0006-0006-0006-000000000006', email: 'bob@bob.com', username: 'bobspeed',   wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0007-0007-0007-000000000007', email: 'car@car.com', username: 'carloscube', wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0008-0008-0008-000000000008', email: 'dia@dia.com', username: 'dianasolve', wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0009-0009-0009-000000000009', email: 'eve@eve.com', username: 'evecuber',   wca_id: null, country_iso2: null },
  { id: 'aaaaaaaa-0010-0010-0010-000000000010', email: 'fer@fer.com', username: 'fernanrubik', wca_id: null, country_iso2: null },
];

// Seed ranking data: simulate a varied leaderboard
const rankings = [
  { user_id: 'aaaaaaaa-0001-0001-0001-000000000001', elo: 1247, wins: 38, losses: 14, dnf_count: 3,  total_matches: 52,  pb_time: 8.43,  average_time: 12.7 },
  { user_id: 'aaaaaaaa-0002-0002-0002-000000000002', elo: 1198, wins: 31, losses: 18, dnf_count: 5,  total_matches: 49,  pb_time: 9.21,  average_time: 13.4 },
  { user_id: 'aaaaaaaa-0003-0003-0003-000000000003', elo: 1155, wins: 25, losses: 20, dnf_count: 7,  total_matches: 45,  pb_time: 10.05, average_time: 14.8 },
  { user_id: 'aaaaaaaa-0004-0004-0004-000000000004', elo: 1089, wins: 20, losses: 25, dnf_count: 4,  total_matches: 45,  pb_time: 11.30, average_time: 15.9 },
  { user_id: 'aaaaaaaa-0005-0005-0005-000000000005', elo: 1042, wins: 16, losses: 22, dnf_count: 8,  total_matches: 38,  pb_time: 12.50, average_time: 17.2 },
  { user_id: 'aaaaaaaa-0006-0006-0006-000000000006', elo: 1000, wins: 10, losses: 10, dnf_count: 2,  total_matches: 20,  pb_time: 14.00, average_time: 18.5 },
  { user_id: 'aaaaaaaa-0007-0007-0007-000000000007', elo: 978,  wins: 8,  losses: 14, dnf_count: 3,  total_matches: 22,  pb_time: 15.20, average_time: 20.1 },
  { user_id: 'aaaaaaaa-0008-0008-0008-000000000008', elo: 950,  wins: 5,  losses: 15, dnf_count: 6,  total_matches: 20,  pb_time: 16.80, average_time: 22.3 },
  { user_id: 'aaaaaaaa-0009-0009-0009-000000000009', elo: 924,  wins: 3,  losses: 12, dnf_count: 5,  total_matches: 15,  pb_time: 18.50, average_time: 24.7 },
  { user_id: 'aaaaaaaa-0010-0010-0010-000000000010', elo: 900,  wins: 2,  losses: 13, dnf_count: 4,  total_matches: 15,  pb_time: 20.10, average_time: 27.0 },
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

  await queryInterface.bulkInsert('rankings', rankings.map(r => ({
    id: uuidv4(),
    user_id: r.user_id,
    event: '3x3',
    elo: r.elo,
    wins: r.wins,
    losses: r.losses,
    dnf_count: r.dnf_count,
    total_matches: r.total_matches,
    pb_time: r.pb_time,
    average_time: r.average_time,
    updated_at: now,
  })));
}

export async function down(queryInterface) {
  const userIds = users.map(u => u.id);
  await queryInterface.bulkDelete('rankings', { user_id: userIds });
  await queryInterface.bulkDelete('wca_profiles', { user_id: users.filter(u => u.wca_id).map(u => u.id) });
  await queryInterface.bulkDelete('users', { id: userIds });
}
