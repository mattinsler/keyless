(function() {
  var MemoryTokenStore, crypto;

  crypto = require('crypto');

  MemoryTokenStore = (function() {

    function MemoryTokenStore() {
      this.tokens = {};
    }

    MemoryTokenStore.prototype.create = function(user_id, opts, callback) {
      var hash, key, token_data;
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      token_data = {
        user_id: user_id,
        opts: opts
      };
      hash = crypto.createHash('sha256');
      hash.update(crypto.randomBytes(16).toString('hex'));
      hash.update(JSON.stringify(token_data));
      key = hash.digest('hex');
      this.tokens[key] = token_data;
      return callback(null, key);
    };

    MemoryTokenStore.prototype.get = function(token, callback) {
      var token_data;
      token_data = this.tokens[token];
      return callback(null, token_data);
    };

    MemoryTokenStore.prototype.remove_token = function(token, callback) {
      delete this.tokens[token];
      return callback();
    };

    MemoryTokenStore.prototype.remove_tokens_for_user = function(user_id, callback) {
      var _this = this;
      Object.keys(this.tokens).filter(function(k) {
        return _this.tokens[k].user_id.toString() === user_id.toString();
      }).forEach(function(k) {
        return delete _this.tokens[k];
      });
      return callback();
    };

    return MemoryTokenStore;

  })();

  module.exports = function(opts) {
    return new MemoryTokenStore(opts);
  };

}).call(this);
