var contextio = require('contextio');
var config = require('../config');

function getClient() {
  return new contextio.Client({
    key: config.CONTEXTIO_KEY,
    secret: config.CONTEXTIO_SECRET
  });
}

function getContextIOAccount(client, email, callback) {
  client.accounts().get({email: email}, function(err, response) {
    if (err || !response.body.length) return callback(err);
    callback(null, response.body[0]['id']);
  });
}

function getPrefix(id) {
  return '[Q' + id + ']';
}
exports.getPrefix = getPrefix;

exports.createHook = function(request, id, callback) {
  var prefix = getPrefix(id);
  var client = getClient();

  getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
    if (err) return callback(err);

    var urlPrefix = request.protocol + '://' + request.get('host') + '/main',
      hookOptions = {
        filter_to: config.EMAIL_USER,
        filter_subject: prefix,
        callback_url: urlPrefix + '/response/' + id,
        failure_notif_url: urlPrefix + '/failure/' + id
      };

    client.accounts(ctxID).webhooks().post(hookOptions, function(err) {
      if (err) return callback(err);
      callback(null);
    });
  });
};

exports.getMessage = function(id, callback) {
  var client = getClient();
  getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
    if (err) return callback(err);
    client.accounts(ctxID).messages(id).body().get({type: 'text/plain'}, function(err, msg) {
      if (err) return callback(err);
      callback(null, msg);
    });
  });
};

exports.forceSync = function(callback) {
  var client = getClient();
  getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
    if (err) return callback(err);
    client.accounts(ctxID).sync();
    callback(null);
  });
}