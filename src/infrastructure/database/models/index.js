import { Sequelize } from 'sequelize';
import { initUser } from './User.js';
import { initWcaProfile } from './WcaProfile.js';
import config from '../config.js';

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
};

Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

export { models };
