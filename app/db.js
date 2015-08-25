var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db.sqlite3');

exports.parallelize = function(callback) {
  return db.parallelize(callback);
};

exports.save = function(table, item, callback) {
  if (!item) return callback('Cannot save a null object');

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

function buildSelect(table, query, orderBy) {
  var sql = 'SELECT * FROM ' + table;
  var vals = [];

  if (query) {
    var where = [];
    for (var key in query) {
      where.push(key + '=?');
      vals.push(query[key]);
    }
    sql += ' WHERE ' + where.join(' AND ');
  }

  if (orderBy) sql += ' ORDER BY ' + orderBy;
  return {sql: sql, vals: vals};
}

exports.fetch = function(table, query, orderBy, callback) {
  if (typeof query === 'function') {
    callback = orderBy;
    orderBy = query;
    query = null;
  }

  if (typeof orderBy === 'function') {
    callback = orderBy
    orderBy = query;
  }

  var select = buildSelect(table, query, orderBy);
  db.all(select.sql, select.vals, callback);
};

exports.get = function(table, query, callback) {
  if (typeof query === 'function') {
    callback = query;
    query = null;
  }

  var select = buildSelect(table, query);
  db.get(select.sql, select.vals, callback);
};