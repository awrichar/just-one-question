var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db.sqlite3');

exports.parallelize = function(callback) {
  return db.parallelize(callback);
};

exports.save = function(table, item, callback) {
  var keys = [], vals = [], qmarks = [];
  for (var key in item) {
    keys.push(key);
    vals.push(item[key]);
    qmarks.push('?');
  }

  var numKeys = keys.length;
  if (numKeys == 0) return callback('Cannot save an empty object');

  var keyString = '(' + keys.join(',') + ')';
  var valString = '(' + qmarks.join(',') + ')';
  var sql = 'INSERT INTO ' + table + ' ' + keyString + ' VALUES ' + valString;

  db.run(sql, vals, function (err) {
    if (err) return callback(err);
    callback(null, this.lastID);
  });
};