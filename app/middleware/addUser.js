module.exports = function(request, response, callback) {
  response.locals.user = request.user;
  callback();
};