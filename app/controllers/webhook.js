var express = require('express');
var bodyParser = require('body-parser');
var error = require('../helpers/error');
var responseModel = require('../models/response');
var helper = require('../helpers/webhook');

var router = express.Router();
module.exports = router;

router.use(bodyParser.json());

router.post('/:id', function (request, response) {
  response.send();

  var pollID = request.params.id,
    messageID = request.body.message_data.message_id;

  helper.getMessage(messageID, function(err, msg) {
    if (err || !msg.body.length) error.log('Error getting message body', err);

    var body = msg.body[0]['content'],
      result = body.match(/^\s*(\d+)/),
      choice = result ? parseInt(result[1]) : null;

    if (!choice || isNaN(choice) || choice < 1)
      return error.log('Error parsing response');

    responseModel.getCount(pollID, function(err, count) {
      if (err) return error.log('Error finding question', err);
      if (choice > count) return error.log('Choice is out of range');

      responseModel.increment(pollID, choice, function(err, changes) {
        if (err || !changes) return error.log('Error writing response', err);
        console.log('Added response (' + choice + ') to question (' + pollID + ')');
      });
    });
  });
});