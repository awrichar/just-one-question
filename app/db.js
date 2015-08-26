var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db.sqlite3');

function buildWhere(query) {
  if (!query) {
    return null;
  }

  var where = [];
  var vals = [];

  for (var key in query) {
    where.push(key + '=?');
    vals.push(query[key]);
  }

  var sql = ' WHERE ' + where.join(' AND ');
  return {sql: sql, vals: vals};
}

function buildSelect(table, query, orderBy) {
  var sql = 'SELECT * FROM ' + table;
  var where = buildWhere(query);
  var vals = [];

  if (where) {
    sql += where.sql;
    vals = where.vals;
  }

  if (orderBy) sql += ' ORDER BY ' + orderBy;

  return {sql: sql, vals: vals};
}

exports.parallelize = function(callback) {
  return db.parallelize(callback);
};

exports.insert = function(table, item, callback) {
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

exports.update = function(table, item, query, callback) {
  var keys = [], vals = [];
  for (var key in item) {
    keys.push(key + '=?');
    vals.push(item[key]);
  }

  var keyString = keys.join(',');
  var sql = 'UPDATE ' + table + ' SET ' + keyString;

  var where = buildWhere(query);
  if (where) {
    sql += where.sql;
    vals = vals.concat(where.vals);
  }

  db.run(sql, vals, function (err) {
    if (err) return callback(err);
    callback(null, this.changes);
  });
};

exports.increment = function(table, field, query, callback) {
  var sql = 'UPDATE ' + table + ' SET ' + field + '=' + field + '+1';
  var vals = [];

  var where = buildWhere(query);
  if (where) {
    sql += where.sql;
    vals = where.vals;
  }

  db.run(sql, vals, function (err) {
    if (err) return callback(err);
    callback(null, this.changes);
  });
};

exports.fetch = function(table, query, orderBy, callback) {
  if (typeof query === 'function') {
    callback = orderBy;
    orderBy = query;
    query = null;
  }

  if (typeof orderBy === 'function') {
    callback = orderBy;
    orderBy = null;
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

exports.count = function(table, query, callback) {
  if (typeof query === 'function') {
    callback = query;
    query = null;
  }

  var sql = 'SELECT COUNT(*) FROM ' + table;
  var where = buildWhere(query);
  var vals = [];

  if (where) {
    sql += where.sql;
    vals = where.vals;
  }

  db.get(sql, vals, function(err, row) {
    if (err) return callback(err);
    callback(null, row['COUNT(*)']);
  });
};