#!/usr/bin/env node
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db.sqlite3');

db.run('DELETE FROM user', function(err) {
  if (err) console.log("Error truncating user table: " + err);
});

db.run('DELETE FROM question', function(err) {
  if (err) console.log("Error truncating user table: " + err);
});

db.run('DELETE FROM response', function(err) {
  if (err) console.log("Error truncating user table: " + err);
});

db.run('DELETE FROM sessions', function(err) {
  if (err) console.log("Error truncating sessions table: " + err);
});

var webhook = require('./app/helpers/webhook');
webhook.getHooks(function(err, hooks) {
  if (err) console.log("Error deleting web hooks: " + err);
  for (var i=0; i<hooks.length; i++) {
    webhook.deleteHook(hooks[i].webhook_id, function(err) {
      if (err)console.log("Error deleting webhook: " + err);
    });
  }
});