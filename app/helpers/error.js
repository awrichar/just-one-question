module.exports = {
  log: function(msg, err) {
    if (err) console.log(msg + ': ' + err);
    else console.log(msg);
  },

  response: function(response, msg, err) {
    this.log(msg, err);
    return response.render('error.ejs', {
      message: msg || 'An unknown error occurred.',
    });
  }
};