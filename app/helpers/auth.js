var querystring = require("querystring");

exports.requireLogin = function(request, response, callback) {
  if (request.isAuthenticated()) return callback();
  var query = querystring.stringify({next: request.originalUrl});
  response.redirect('/auth/login?' + query);
}