#!/usr/bin/env node
var db = require('./app/db');
var knex = db.knex;

knex.schema.createTable('user', function (table) {
  table.increments();
  table.string('username').unique();
  table.string('password');
  table.string('confirmation_code', 20);
}).asCallback(function(err) {
  if (err) console.log(err);

  knex.schema.createTable('question', function (table) {
    table.increments();
    table.integer('user_id');
    table.string('recipients');
    table.text('question');
  }).asCallback(function(err) {
    if (err) console.log(err);

    knex.schema.createTable('response', function (table) {
      table.increments();
      table.integer('question_id');
      table.integer('idx');
      table.string('label');
      table.integer('count').defaultTo(0);
    }).asCallback(function(err) {
      if (err) console.log(err);
      knex.destroy();
    });
  });
});
