var querystring = require("querystring");
var hash = require('password-hash');
var userModel = require('../models/user');
var addUser = require('../middleware/addUser');

module.exports = {
  redirectToLogin: function(request, response) {
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
    request.login(user, function(err) {
      if (err) return callback(err);
      addUser(request, response, function() {
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