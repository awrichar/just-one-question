var express = require('express');
var questionModel = require('../models/question');
var responseModel = require('../models/response');
var auth = require('../helpers/auth');
var error = require('../helpers/error');

var router = express.Router();
module.exports = router;

router.get('/', auth.requireLogin, function(request, response) {
  questionModel.list(request.user.username, function(err, rows) {
    if (err) return error.response(response, 'Error listing results', err);
    response.render('results.ejs', {questions: rows});
  });
});

router.get('/:id', auth.requireLogin, function(request, response) {
  questionModel.get(request.params.id, function(err, question) {
    if (err) return error.response(response, 'Error fetching question', err);

    if (question.owner != request.user.username) {
      return error.response(response, 'Not allowed to access this question');
    }

    responseModel.list(request.params.id, function(err, responses) {
      if (err) return error.response(response, 'Error fetching responses', err);
      response.render('result.ejs', {question: question, responses: responses});
    });
  });
});