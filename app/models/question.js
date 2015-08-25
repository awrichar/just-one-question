var db = require('../db');

exports.create = function(owner, recipients, question, callback) {
  db.save('question', {
    owner: owner,
    recipients: recipients,
    question: question,
  }, callback);
}