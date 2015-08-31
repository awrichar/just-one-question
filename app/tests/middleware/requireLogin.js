var sinon = require('sinon');
var assert = require('assert');
var requireLogin = require('../../middleware/requireLogin');

describe('Require login middleware', function(){
  it('should redirect unauthenticated requests to login', function() {
    var request = {
      isAuthenticated: function() { return false; }
    };
    var response = {
      redirect: sinon.spy(),
    };
    var callback = sinon.spy();

    requireLogin(request, response, callback);

    assert.ok(response.redirect.calledOnce, 'response was redirected');
    assert.ok(!callback.called, 'callback was not invoked');
  });

  it('should do nothing for authenticated requests', function() {
    var request = {
      isAuthenticated: function() { return true; }
    };
    var response = {
      redirect: sinon.spy(),
    };
    var callback = sinon.spy();

    requireLogin(request, response, callback);

    assert.ok(!response.redirect.called, 'response object was not redirected');
    assert.ok(callback.calledOnce, 'callback was invoked');
  });
});