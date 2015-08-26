var express = require('express');

var router = express.Router();
module.exports = router;

router.use('/auth', require('./auth'));
router.use('/main', require('./poll'));
router.use('/results', require('./results'));

router.get('/', function(request, response) {
  response.redirect('/main');
});