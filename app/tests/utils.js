var sinon = require('sinon');

module.exports = {
  stubModule: function(module) {
    for (var method in module) {
      sinon.stub(module, method);
    }
  },

  restoreModule: function(module) {
    for (var method in module) {
      module[method].restore();
    }
  }
};