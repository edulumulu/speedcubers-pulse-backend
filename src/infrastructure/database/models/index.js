import { Sequelize } from 'sequelize';
import { initUser } from './User.js';
import { initWcaProfile } from './WcaProfile.js';
import { defineRanking } from './Ranking.js';
import { defineCompetition } from './Competition.js';
import { defineCompetitionRound } from './CompetitionRound.js';
import { defineResult } from './Result.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const config = require('../config.cjs');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

export const sequelize = new Sequelize(dbConfig.url, {
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
  ...(dbConfig.dialectOptions ? { dialectOptions: dbConfig.dialectOptions } : {}),
});

const models = {
  User: initUser(sequelize),
  WcaProfile: initWcaProfile(sequelize),
  Ranking: defineRanking(sequelize),
  Competition: defineCompetition(sequelize),
  CompetitionRound: defineCompetitionRound(sequelize),
  Result: defineResult(sequelize),
};

Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

export { models };
