var querystring = require("querystring");
var hash = require('password-hash');
var userModel = require('../models/user');

function addUserToResponse(request, response, callback) {
  response.locals.user = request.user;
  callback();
};
exports.addUserToResponse = addUserToResponse;

exports.requireLogin = function(request, response, callback) {
  if (request.isAuthenticated()) return callback();
  var query = querystring.stringify({next: request.originalUrl});
  response.redirect('/auth/login?' + query);
};

function checkPassword(username, password, callback) {
  userModel.get(username, function(err, user) {
    if (err) callback(err);
    else if (!user) callback(null, false);
    else if (!hash.verify(password, user.password)) callback(null, false);
    else callback(null, user);
  });
}
exports.checkPassword = checkPassword;

function setUser(request, response, user, callback) {
  request.login(user, function(err) {
    if (err) return callback(err);
    addUserToResponse(request, response, function() {
      callback(null, user);
    });
  });
}
exports.setUser = setUser;

exports.checkAndLogin = function(request, response, username, password, callback) {
  checkPassword(username, password, function(err, user) {
    if (err) return callback(err);
    if (!user) return callback(null, user);
    setUser(request, response, user, callback);
  });
}