exports.getRootUri = function(request) {
  return request.protocol + '://' + request.get('host');
};