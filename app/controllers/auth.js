var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var passportLocal = require('passport-local');
var userModel = require('../models/user');
var helper = require('../helpers/auth');
var error = require('../helpers/error');
var email = require('../helpers/email');

var router = express.Router();
module.exports = router;

router.use(bodyParser.urlencoded({ extended: false }));

router.get('/login', function(request, response) {
  response.render('login.ejs');
});

router.post('/login', function(request, response, callback) {
  var next = request.query.next || '/';

  passport.authenticate('local', function(err, user, info) {
    if (err) return callback(err);
    if (!user) return response.redirect('/auth/login');

    request.login(user, function(err) {
      if (err) return callback(err);
      return response.redirect(next);
    });
  })(request, response, callback);
});

router.get('/logout', function(request, response) {
  request.logout();
  response.redirect('/');
});

router.get('/forgot', function(request, response) {
  response.render('forgot.ejs');
});

router.post('/forgot', function(request, response) {
  var username = request.body.username;
  userModel.changePassword(username, function(err, password) {
    if (err || !password) return error.response(response, 'Error changing password', err);
    var body = 'Your new password is ' + password + '.';
    email.send('from', username, [], 'Password change requested', body, function(err) {
      if (err) return error.response(response, 'Error sending password email', err);
      response.render('forgot_success.ejs', {email: username});
    });
  });
});

passport.serializeUser(function(user, callback) {
  callback(null, user.username);
});

passport.deserializeUser(function(username, callback) {
  userModel.get(username, function(err, user) {
    callback(err, user);
  });
});

passport.use(new passportLocal.Strategy(helper.checkPassword));
