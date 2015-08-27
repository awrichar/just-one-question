#!/usr/bin/env node
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db.sqlite3');

db.run('CREATE TABLE question (id INTEGER PRIMARY KEY, owner TEXT, recipients TEXT, question TEXT)', function(err) {
  // do nothing
});

db.run('CREATE TABLE response (question_id INTEGER, idx INTEGER, label TEXT, count INTEGER DEFAULT 0)', function(err) {
  // do nothing
});

db.run('CREATE TABLE user (username TEXT, password TEXT, confirmation_code TEXT)', function(err) {
  // do nothing
});