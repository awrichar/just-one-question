var request = require('supertest');
var server = require('../../server');

function checkRoute(route, status) {
  if (!status) status = 200;
  it('GET ' + route + ' should respond with ' + status, function(done) {
    request(server).get(route).expect(status, done);
  });
}

describe('Basic route check', function(){
  checkRoute('/main');
  checkRoute('/about');
  checkRoute('/auth/login');
  checkRoute('/auth/forgot');
  checkRoute('/auth/profile', 302);
  checkRoute('/results', 302);
});