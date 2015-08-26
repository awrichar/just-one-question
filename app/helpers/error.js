function log(msg, err) {
  if (err) console.log(msg + '\n' + err);
  else console.log(msg);
}
exports.log = log;

function response(response, msg, err) {
  log(msg, err);
  return response.render('error.ejs');
}
exports.response = response;