var express = require('express');
var questionModel = require('../models/question');
var responseModel = require('../models/response');
var requireLogin = require('../middleware/requireLogin');
var error = require('../helpers/error');
var webhook = require('../helpers/webhook');

var router = express.Router();
module.exports = router;

router.get('/', requireLogin, function(request, response) {
  questionModel.list(request.user.id, function(err, rows) {
    if (err) return error.response(response, 'Error listing results', err);
    response.render('results.ejs', {questions: rows});
  });
});

router.get('/:id', requireLogin, function(request, response) {
  if (request.query.refresh == "true") {
    webhook.forceSync(function(err) {
      if (err) return error.response(response, 'Error refreshing results', err);
      renderResult(request, response);
    });
  } else {
    renderResult(request, response);
  }
});

function renderResult(request, response) {
  questionModel.get(request.params.id, function(err, question) {
    if (err) return error.response(response, 'Error fetching question', err);

    if (question.user_id != request.user.id) {
      return error.response(response, 'Not allowed to access this question');
    }

    responseModel.list(request.params.id, function(err, responses) {
      if (err) return error.response(response, 'Error fetching responses', err);
      response.render('result.ejs', {question: question, responses: responses});
    });
  });
}