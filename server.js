#!/usr/bin/env node
var http = require('http');
var express = require('express');

var app = express();
app.use(express.static('./app/public'));
app.use(require('./app/controllers'))

var server = http.createServer(app);
server.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0', function(){
  var addr = server.address();
  console.log('Server listening at', addr.address + ':' + addr.port);
});