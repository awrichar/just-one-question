var db = require('../db');
var TABLE = 'response';

exports.createMany = function(question_id, choices, callback) {
  var errors = 0;

  db.parallelize(function() {
    for (var i=0; i<choices.length; i++) {
      db.save(TABLE, {
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
  var sql = 'SELECT COUNT(*) FROM ' + TABLE + ' WHERE question_id = ?';
  db.get(sql, question_id, function(err, row) {
    if (err) return callback(err);
    callback(null, row['COUNT(*)']);
  });
};

exports.increment = function(question_id, idx, callback) {
  var sql = 'UPDATE response SET count=count+1 WHERE question_id=? AND idx=?';
  db.run(sql, question_id, idx, function(err) {
    if (err) return callback(err);
    callback(null, this.changes);
  });
};

exports.list = function(question_id, callback) {
  db.fetch(TABLE, {question_id: question_id}, 'idx', callback);
};