#!/usr/bin/env node
var CONTEXTIO_KEY = "auscnwj4";
var CONTEXTIO_SECRET = "l6iPLC55PdyiYxwI";
var EMAIL_USER = "just.one.question.app@gmail.com";
var EMAIL_PASSWORD = "bD0SzshyNBpV5Zt";

var http = require('http');
var express = require('express');
var contextio = require('contextio');
var nodemailer = require('nodemailer');

var app = express();
var server = http.createServer(app);

app.use('/css', express.static('./client/css'));
app.use('/js', express.static('./client/js'));
app.use('/img', express.static('./client/img'));
app.set('views', './client/views');

app.use(express.bodyParser());

app.get('/', function(request, response) {
  response.render("index.ejs");
});

app.post('/', function (request, response) {
  var from = request.body.email,
    recipients = request.body.recipients,
    question = request.body.question,
    choices = request.body.choices.split("\n");
  
  response.render("preview.ejs", {
    email: from,
    recipients: recipients,
    question: question,
    choices: choices
  });
});

app.post('/send', function (request, response) {
  var from = request.body.email,
    recipients = request.body.recipients,
    question = request.body.question,
    choices = request.body.choices.split("\n");
  
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
    }
  });
  
  var mailOptions = {
    from: from,
    to: recipients,
    subject: question,
    text: choices.join("\n")
  };
  
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
        console.log(error);
    } else {
        console.log('Message sent: ' + info.response);
    }
  });
  
  response.render("success.ejs");
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});
