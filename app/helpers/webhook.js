var contextio = require('contextio');
var config = require('../config');
var uriHelper = require('./uri');

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

module.exports = {
  getPrefix: function(id) {
    return '[Q' + id + ']';
  },

  createHook: function(request, id, callback) {
    var prefix = this.getPrefix(id);
    var client = getClient();

    getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
      if (err) return callback(err);

      var urlPrefix = uriHelper.getRootUri(request) + '/main',
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
  },

  getHooks: function(callback) {
    var client = getClient();
    getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
      if (err) return callback(err);

      client.accounts(ctxID).webhooks().get(function(err, resp) {
        if (err) return callback(err);
        callback(null, resp.body);
      });
    });
  },

  deleteHook: function(id, callback) {
    var client = getClient();
    getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
      if (err) return callback(err);
      client.accounts(ctxID).webhooks(id).delete(callback);
    });
  },

  getMessage: function(id, callback) {
    var client = getClient();
    getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
      if (err) return callback(err);
      client.accounts(ctxID).messages(id).body().get({type: 'text/plain'}, function(err, msg) {
        if (err) return callback(err);
        callback(null, msg);
      });
    });
  },

  forceSync: function(callback) {
    var client = getClient();
    getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
      if (err) return callback(err);
      client.accounts(ctxID).sync();
      callback(null);
    });
  }
};