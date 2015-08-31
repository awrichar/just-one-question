var auth = require('../helpers/auth');

module.exports = function(request, response, callback) {
  if (request.isAuthenticated()) return callback();
  auth.redirectToLogin(request, response);
};