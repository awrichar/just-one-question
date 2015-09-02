var express = require('express');
var bodyParser = require('body-parser');
var questionForm = require('../forms/question');
var parseQuestionForm = require('./question/parseQuestionForm');

var router = express.Router();
module.exports = router;

router.use(bodyParser.urlencoded({ extended: false }));

router.get('/', function(request, response) {
  var hideEmail = request.user ? true : false;
  var form = questionForm({hideEmail: hideEmail});
  parseQuestionForm.renderEditForm(form, response);
});

router.post('/', function (request, response) {
  parseQuestionForm(request, response);
});