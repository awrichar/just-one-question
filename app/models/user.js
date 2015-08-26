var db = require('../db');
var hash = require('password-hash');
var shortid = require('shortid');
var TABLE = 'user';

exports.create = function(username, password, callback) {
  var user = {
    username: username,
    password: hash.generate(password),
    confirmation_code: shortid.generate(),
  };

  db.insert(TABLE, user, function(err) {
    if (err) return callback(err);
    callback(null, user);
  });
};

exports.get = function(username, callback) {
  db.get(TABLE, {username: username}, callback);
};

exports.confirm = function(username, code, callback) {
  db.get(TABLE, {username: username}, function(err, row) {
    if (err) return callback(err);
    if (code != row.confirmation_code) return callback(null, false);

    db.update(TABLE, {confirmation_code: null}, {username: username}, function(err, changes) {
      if(err) return callback(err);
      callback(null, changes > 0);
    });
  });
}