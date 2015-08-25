var db = require('../db');

exports.createMany = function(question_id, choices, callback) {
  var errors = 0;

  db.parallelize(function() {
    for (var i=0; i<choices.length; i++) {
      db.save('response', {
        question_id: question_id,
        idx: i + 1,
        label: choices[i],
      }, function(err) {
        if (err) errors++;
      });
    }
  });

  if (errors == 0) callback(null);
  else callback(errors);
}