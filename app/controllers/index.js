var express = require('express');

var app = express();
app.set('views', './app/views');

app.use('/poll', require('./poll'))

app.get('/', function(request, response) {
  response.render("index.ejs");
});

module.exports = app