(function() {
  var RedisTicketStore, crypto, redis_builder;

  crypto = require('crypto');

  redis_builder = require('redis-builder');

  RedisTicketStore = (function() {

    function RedisTicketStore(opts) {
      var _ref;
      if (opts == null) {
        opts = {};
      }
      this.client = redis_builder(opts);
      this.prefix = (_ref = opts.prefix) != null ? _ref : 'keyless-t:';
    }

    RedisTicketStore.prototype.create = function(user_id, callback) {
      var key;
      key = crypto.randomBytes(16).toString('hex');
      return this.client.setex(this.prefix + key, 60, user_id, function(err) {
        if (err != null) {
          return callback(err);
        }
        return callback(null, key);
      });
    };

    RedisTicketStore.prototype.get = function(ticket, callback) {
      return this.client.multi().get(this.prefix + ticket, callback).del(this.prefix + ticket).exec();
    };

    return RedisTicketStore;

  })();

  module.exports = function(opts) {
    return new RedisTicketStore(opts);
  };

}).call(this);
