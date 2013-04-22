(function() {
  var MemoryTicketStore, crypto;

  crypto = require('crypto');

  MemoryTicketStore = (function() {

    function MemoryTicketStore() {
      this.tickets = {};
    }

    MemoryTicketStore.prototype.create = function(user_id, callback) {
      var key;
      key = crypto.randomBytes(16).toString('hex');
      this.tickets[key] = user_id;
      return callback(null, key);
    };

    MemoryTicketStore.prototype.get = function(ticket, callback) {
      var user_id;
      user_id = this.tickets[ticket];
      delete this.tickets[ticket];
      return callback(null, user_id);
    };

    return MemoryTicketStore;

  })();

  module.exports = function(opts) {
    return new MemoryTicketStore(opts);
  };

}).call(this);
