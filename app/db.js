var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite3'
  }
});

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

  knex(table)
    .where(query)
    .first()
    .asCallback(callback);
};

exports.count = function(table, query, callback) {
  knex(table)
    .count('*')
    .asCallback(callback);
};