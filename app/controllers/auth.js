var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var passportLocal = require('passport-local');
var userModel = require('../models/user');
var helper = require('../helpers/auth');

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

passport.serializeUser(function(user, callback) {
  callback(null, user.username);
});

passport.deserializeUser(function(username, callback) {
  userModel.get(username, function(err, user) {
    callback(err, user);
  });
});

passport.use(new passportLocal.Strategy(helper.checkPassword));
