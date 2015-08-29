var nodemailer = require('nodemailer');
var config = require('../config');

var DEFAULT_FROM = 'Just One Question';

exports.send = function(options, callback) {
  var fromName = options.fromName || DEFAULT_FROM;
  var to = options.to || [];
  var bcc = options.bcc || [];
  var subject = options.subject || '';
  var body = options.body || '';

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
    to: to,
    bcc: bcc,
    subject: subject,
    text: body
  };

  transporter.sendMail(mailOptions, function(err, info) {
    if (err) return callback(err);
    callback(null);
  });
}