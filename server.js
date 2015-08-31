#!/usr/bin/env node
var http = require('http');
var express = require('express');
var session = require('express-session');
var passport = require('passport');
var addUser = require('./app/middleware/addUser');
var controllers = require('./app/controllers');
var config = require('./app/config');
var db = require('./app/db');

var KnexSessionStore = require('connect-session-knex')(session);

var app = express();
module.exports = app;

app.use(express.static('./app/public'));
app.use(session({
  secret: config.SESSION_KEY,
  store: new KnexSessionStore({
    knex: db.knex,
  }),
  resave: true,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(addUser);
app.use(controllers);
app.set('views', './app/views');

var server = http.createServer(app);
server.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0', function(){
  var addr = server.address();
  console.log('Server listening at', addr.address + ':' + addr.port);
});