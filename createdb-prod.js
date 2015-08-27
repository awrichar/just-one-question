#!/usr/bin/env node
var knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

knex.schema.createTable('users', function (table) {
  table.increments();
  table.string('username').unique();
  table.string('password');
  table.string('confirmation_code', 20);
});

knex.schema.createTable('question', function (table) {
  table.increments();
  table.integer('user_id');
  table.string('recipients');
  table.text('question');
});

knex.schema.createTable('response', function (table) {
  table.increments();
  table.integer('question_id');
  table.integer('idx');
  table.string('label');
  table.integer('count').defaultTo(0);
});