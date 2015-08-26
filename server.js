#!/usr/bin/env node
var http = require('http');
var express = require('express');
var session = require('express-session');
var passport = require('passport');
var controllers = require('./app/controllers');

var app = express();
app.use(express.static('./app/public'));
app.use(session({ secret: 'just-one-question' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(function(request, response, callback) {
  response.locals.user = request.user;
  callback();
});
app.use(controllers);
app.set('views', './app/views');

var server = http.createServer(app);
server.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0', function(){
  var addr = server.address();
  console.log('Server listening at', addr.address + ':' + addr.port);
});