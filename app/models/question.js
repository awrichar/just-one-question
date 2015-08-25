var db = require('../db');
var TABLE = 'question';

exports.create = function(owner, recipients, question, callback) {
  db.insert(TABLE, {
    owner: owner,
    recipients: recipients,
    question: question,
  }, callback);
};

exports.list = function(callback) {
  db.fetch(TABLE, callback);
};

exports.get = function(id, callback) {
  db.get(TABLE, {id: id}, callback);
};