var nodemailer = require('nodemailer');
var config = require('../config');

exports.send = function(fromName, recipients, subject, body, callback) {
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASSWORD,
    }
  });

  var mailOptions = {
    from: fromName + '<' + config.EMAIL_USER + '>',
    replyTo: config.EMAIL_USER,
    to: recipients,
    subject: subject,
    text: body
  };

  transporter.sendMail(mailOptions, function(err, info) {
    if (err) return callback(err);
    callback(null);
  });
}