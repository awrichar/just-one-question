var querystring = require("querystring");
var hash = require('password-hash');
var userModel = require('../models/user');

exports.requireLogin = function(request, response, callback) {
  if (request.isAuthenticated()) return callback();
  var query = querystring.stringify({next: request.originalUrl});
  response.redirect('/auth/login?' + query);
}

function checkPassword(username, password, callback) {
  userModel.get(username, function(err, user) {
    if (err) callback(err);
    else if (!user) callback(null, false);
    else if (!hash.verify(password, user.password)) callback(null, false);
    else callback(null, user);
  });
}
exports.checkPassword = checkPassword;

exports.checkAndLogin = function(request, username, password, callback) {
  checkPassword(username, password, function(err, user) {
    if (err) return callback(err);
    if (!user) return callback(null, user);

    request.login(user, function(err) {
      if (err) return callback(err);
      callback(null, user);
    })
  });
}