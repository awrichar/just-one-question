var db = require('../db');
var TABLE = 'response';

exports.createMany = function(question_id, choices, callback) {
  var items = [];
  for (var i=0; i<choices.length; i++) {
    items.push({
      question_id: question_id,
      idx: i + 1,
      label: choices[i],
    });
  }

  db.insert(TABLE, items, function(err) {
    if (err) return callback(err);
    callback(null);
  })
};

exports.getCount = function(question_id, callback) {
  db.count(TABLE, {question_id: question_id}, callback);
};

exports.increment = function(question_id, idx, callback) {
  db.increment(TABLE, 'count', {question_id: question_id, idx: idx}, callback);
};

exports.list = function(question_id, callback) {
  db.fetch(TABLE, {question_id: question_id}, 'idx', callback);
};