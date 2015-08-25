var express = require('express');
var app = express();
app.set('views', './app/views');

app.use('/main', require('./poll'))

app.get('/', function(request, response) {
  response.redirect('/main');
});

module.exports = app