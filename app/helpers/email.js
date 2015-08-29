var nodemailer = require('nodemailer');
var config = require('../config');
var ejs = require('ejs');

var DEFAULT_FROM = 'Just One Question';

exports.send = function(options, callback) {
  var fromName = options.fromName || DEFAULT_FROM;
  var to = options.to || [];
  var bcc = options.bcc || [];
  var subject = options.subject || '';
  var text = options.text || '';
  var template = options.template || null;
  var templateOptions = options.templateOptions || {};

  renderBody(template, templateOptions, function(err, html) {
    if (err) return callback(err);

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
      text: text,
      html: html
    };

    transporter.sendMail(mailOptions, function(err, info) {
      if (err) return callback(err);
      callback(null);
    });
  })
};

function renderBody(template, templateOptions, callback) {
  if (!template) return callback();
  ejs.renderFile(template, templateOptions, callback);
}