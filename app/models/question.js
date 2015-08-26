var db = require('../db');
var TABLE = 'question';

exports.create = function(user_id, recipients, question, callback) {
  db.insert(TABLE, {
    user_id: user_id,
    recipients: recipients,
    question: question,
  }, callback);
};

exports.list = function(user_id, callback) {
  db.fetch(TABLE, {user_id: user_id}, callback);
};

exports.get = function(id, callback) {
  db.get(TABLE, {id: id}, callback);
};