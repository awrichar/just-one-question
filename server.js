#!/usr/bin/env node
var http = require('http');
var express = require('express');
var sqlite3 = require('sqlite3');

var app = express();
var db = new sqlite3.Database('./db.sqlite3');

db.run("CREATE TABLE question (id INTEGER PRIMARY KEY, owner TEXT, recipients TEXT, question TEXT)", function (err) {
  // do nothing
});

db.run("CREATE TABLE response (question_id INTEGER, idx INTEGER, label TEXT, count INTEGER DEFAULT 0)", function (err) {
  // do nothing
});

app.use(express.static('./app/public'));
app.use(require('./app/controllers'))

var server = http.createServer(app);
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});