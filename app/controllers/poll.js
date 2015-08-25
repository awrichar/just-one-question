var CONTEXTIO_KEY = "auscnwj4";
var CONTEXTIO_SECRET = "l6iPLC55PdyiYxwI";
var EMAIL_USER = "just.one.question.app@gmail.com";
var EMAIL_PASSWORD = "bD0SzshyNBpV5Zt";

var express = require('express');
var sqlite3 = require('sqlite3');
var contextio = require('contextio');
var nodemailer = require('nodemailer');

var app = express();
app.set('views', './app/views');
app.use(express.bodyParser());

var db = new sqlite3.Database('./db.sqlite3');

function numberChoices(choices) {
  var output = [];

  for (var i=0; i<choices.length; i++) {
    output.push((i+1) + ") " + choices[i]);
  }

  return output;
}

app.post('/', function (request, response) {
  response.render("preview.ejs", {
    email: request.body.email,
    recipients: request.body.recipients,
    question: request.body.question,
    choices: numberChoices(request.body.choices.split("\n"))
  });
});

app.post('/send', function (request, response) {
  var from = request.body.email,
    recipients = request.body.recipients,
    question = request.body.question,
    choices = request.body.choices;

  db.run("INSERT INTO question (owner, recipients, question, choices) VALUES (?, ?, ?, ?)",
    [from, recipients, question, choices],
    function (err) {
      if (err) {
        console.log("Error inserting into database");
        console.log(err);
        return response.render("error.ejs");
      }

      var id = this.lastID,
        subject = "[Q" + id + "] " + question,
        body = "You've been asked a question by " + from + ":\n" + question + "\n\n" +
          choices + "\n\nPlease respond to this email with a single number indicating your choice.";

      var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD,
        }
      });

      var mailOptions = {
        from: from + "<" + EMAIL_USER + ">",
        replyTo: EMAIL_USER,
        to: recipients,
        subject: subject,
        text: body
      };

      transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
          console.log("Error sending email");
          console.log(err);
          return response.render("error.ejs");
        }

        console.log('Message sent: ' + info.response);
        return response.render("success.ejs");
      });
    }
  );
});

module.exports = app