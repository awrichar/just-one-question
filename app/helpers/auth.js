var querystring = require("querystring");
var hash = require('password-hash');
var userModel = require('../models/user');

module.exports = {
  addUserToResponse: function(request, response, callback) {
    response.locals.user = request.user;
    callback();
  },

  requireLogin: function(request, response, callback) {
    if (request.isAuthenticated()) return callback();
    var query = querystring.stringify({next: request.originalUrl});
    response.redirect('/auth/login?' + query);
  },

  checkPassword: function(username, password, callback) {
    userModel.get(username, function(err, user) {
      if (err) callback(err);
      else if (!user) callback(null, false);
      else if (!hash.verify(password, user.password)) callback(null, false);
      else callback(null, user);
    });
  },

  setUser: function(request, response, user, callback) {
    var self = this;
    request.login(user, function(err) {
      if (err) return callback(err);
      self.addUserToResponse(request, response, function() {
        callback(null, user);
      });
    });
  },

  checkAndLogin: function(request, response, username, password, callback) {
    var self = this;
    self.checkPassword(username, password, function(err, user) {
      if (err) return callback(err);
      if (!user) return callback(null, user);
      self.setUser(request, response, user, callback);
    });
  }
};