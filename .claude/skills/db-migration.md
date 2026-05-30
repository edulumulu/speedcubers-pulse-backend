---
name: db-migration
description: Create or run a Sequelize database migration for the SpeedCubers Spain backend. Use when the user needs to add a table, add/modify a column, add an index, or alter a foreign key. Trigger when the user mentions "migration", "new table", "add column", "alter table", or when scaffolding a new feature that requires a DB change.
---

# DB Migration

Create or run a Sequelize migration following the project conventions.

## File naming

Format: `<NNN>-<action>-<table>.js` inside `src/infrastructure/database/migrations/`

- `NNN` = sequential 3-digit number (check existing migrations and increment)
- `action` = `create`, `add`, `remove`, `alter`, `rename`
- `table` = table name in English (plural, snake_case)

Examples: `003-create-results.js`, `004-add-average-time-to-rankings.js`

## Template

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // describe what this migration does
  },

  async down(queryInterface, Sequelize) {
    // reverse of up — must be a true rollback
  },
};
```

## Common patterns

**Create table:**
```js
await queryInterface.createTable('results', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  competition_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'competitions', key: 'id' },
    onDelete: 'CASCADE',
  },
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  raw_time: { type: Sequelize.INTEGER, allowNull: false },  // milliseconds
  is_dnf: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  penalty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});
```

**Add column:**
```js
await queryInterface.addColumn('users', 'average_time', {
  type: Sequelize.INTEGER,
  allowNull: true,
});
// down: await queryInterface.removeColumn('users', 'average_time');
```

**Add index:**
```js
await queryInterface.addIndex('results', ['user_id'], { name: 'results_user_id_idx' });
// down: await queryInterface.removeIndex('results', 'results_user_id_idx');
```

## Rules

- All table and column names in English (snake_case)
- Always implement a working `down()` — never leave it empty
- Foreign keys must specify `onDelete` behavior
- Timestamps (`created_at`, `updated_at`) required on every new table
- Never rename or delete columns without a matching Sequelize model update

## Running migrations

```bash
npm run db:migrate           # run all pending migrations
npm run db:migrate:undo      # rollback last migration
npm run db:migrate:status    # show migration state
```

## After creating the migration

Suggest the expected commit:
```
chore(db): add migration <NNN>-<action>-<table>
```
