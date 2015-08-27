var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db.sqlite3');

var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite3'
  }
});

exports.parallelize = function(callback) {
  return db.parallelize(callback);
};

exports.insert = function(table, item, callback) {
  if (!item) return callback('Cannot save a null object');

  knex(table).insert(item).asCallback(function(err, ids) {
    if (err) return callback(err);
    callback(null, ids[0]);
  });
};

exports.update = function(table, item, query, callback) {
  knex(table)
    .where(query)
    .update(item)
    .asCallback(callback);
};

exports.increment = function(table, field, query, callback) {
  knex(table)
    .where(query)
    .increment(field, 1)
    .asCallback(callback);
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

  knex.select().from(table)
    .where(query)
    .orderBy(orderBy || '')
    .asCallback(callback);
};

exports.get = function(table, query, callback) {
  if (typeof query === 'function') {
    callback = query;
    query = null;
  }

  knex.select().from(table)
    .where(query)
    .limit(1)
    .asCallback(function(err, rows) {
      if (err) return callback(err);
      if (!rows || !rows.length) return callback(null);
      callback(null, rows[0]);
    });
};

exports.count = function(table, query, callback) {
  knex(table)
    .count('*')
    .asCallback(callback);
};