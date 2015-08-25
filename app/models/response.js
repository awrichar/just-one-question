var db = require('../db');
var TABLE = 'response';

exports.createMany = function(question_id, choices, callback) {
  var errors = 0;

  db.parallelize(function() {
    for (var i=0; i<choices.length; i++) {
      db.insert(TABLE, {
        question_id: question_id,
        idx: i + 1,
        label: choices[i],
      }, function(err) {
        if (err) errors++;
      });
    }
  });

  if (errors == 0) callback(null);
  else callback(errors);
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