(function() {
  var MemoryTokenStore, crypto;

  crypto = require('crypto');

  MemoryTokenStore = (function() {

    function MemoryTokenStore() {
      this.tokens = {};
      this.tokens_by_data = {};
    }

    MemoryTokenStore.prototype.create = function(user_id, opts, callback) {
      var hash, key, token_data, token_data_str;
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      token_data = {
        user_id: user_id,
        opts: opts
      };
      token_data_str = JSON.stringify(token_data);
      if (this.tokens_by_data[token_data_str] != null) {
        return callback(null, this.tokens_by_data[token_data_str]);
      }
      hash = crypto.createHash('sha256');
      hash.update(crypto.randomBytes(16).toString('hex'));
      hash.update(token_data_str);
      key = hash.digest('hex');
      this.tokens[key] = token_data;
      this.tokens_by_data[token_data_str] = key;
      return callback(null, key);
    };

    MemoryTokenStore.prototype.get = function(token, callback) {
      var token_data;
      token_data = this.tokens[token];
      return callback(null, token_data);
    };

    MemoryTokenStore.prototype.remove_token = function(token, callback) {
      var token_data_str;
      token_data_str = JSON.stringify(this.tokens[token]);
      delete this.tokens[token];
      delete this.tokens_by_data[token_data_str];
      return callback();
    };

    MemoryTokenStore.prototype.remove_tokens_for_user = function(user_id, callback) {
      var _this = this;
      Object.keys(this.tokens).filter(function(k) {
        return _this.tokens[k].user_id.toString() === user_id.toString();
      }).forEach(function(k) {
        return _this.remove_token(k, function() {});
      });
      return callback();
    };

    return MemoryTokenStore;

  })();

  module.exports = function(opts) {
    return new MemoryTokenStore(opts);
  };

}).call(this);
