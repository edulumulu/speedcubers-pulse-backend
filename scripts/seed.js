import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize } from 'sequelize';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const config = require('../src/infrastructure/database/config.cjs');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

if (env === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  throw new Error('Refusing to run database seeders in production');
}

const sequelize = new Sequelize(dbConfig.url, {
  dialect: dbConfig.dialect,
  logging: false,
  ...(dbConfig.dialectOptions ? { dialectOptions: dbConfig.dialectOptions } : {}),
});

const seedersPath = resolve(__dirname, '../src/infrastructure/database/seeders');
const seederFiles = readdirSync(seedersPath).filter(f => f.endsWith('.js')).sort();

const seeders = await Promise.all(
  seederFiles.map(async (file) => {
    const mod = await import(`${seedersPath}/${file}`);
    return {
      name: file,
      up: () => mod.up(sequelize.getQueryInterface(), Sequelize),
      down: () => mod.down(sequelize.getQueryInterface(), Sequelize),
    };
  }),
);

const umzug = new Umzug({
  migrations: seeders,
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeData' }),
  logger: console,
});

const command = process.argv[2];

if (command === 'down') {
  await umzug.down();
} else if (command === 'down:all') {
  await umzug.down({ to: 0 });
} else {
  await umzug.up();
}

await sequelize.close();
