(function() {
  var TokenStore, crypto;

  crypto = require('crypto');

  TokenStore = (function() {

    function TokenStore(opts) {
      this.ttl = opts.ttl || (60 * 60 * 24);
    }

    TokenStore.prototype.create = function(user_id, opts, callback) {
      var token_data, _ref,
        _this = this;
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      if ((_ref = opts.ttl) == null) {
        opts.ttl = this.ttl;
      }
      token_data = {
        user_id: user_id,
        opts: opts
      };
      return this.get_token_by_data(token_data, function(err, token) {
        var hash;
        if (err != null) {
          return callback(err);
        }
        if (token != null) {
          return callback(null, token);
        }
        hash = crypto.createHash('sha256');
        hash.update(crypto.randomBytes(16).toString('hex'));
        hash.update(JSON.stringify(token_data));
        token = hash.digest('hex');
        return _this.save(token, token_data, function(err) {
          if (err != null) {
            return callback(err);
          }
          return callback(null, token);
        });
      });
    };

    TokenStore.prototype.update_token_opts = function(token, opts, callback) {
      var _this = this;
      return this.get(token, {
        extend_ttl: false
      }, function(err, token_data) {
        var _ref;
        if (err != null) {
          return typeof callback === "function" ? callback(err) : void 0;
        }
        if (token_data == null) {
          return typeof callback === "function" ? callback() : void 0;
        }
        if ((_ref = opts.ttl) == null) {
          opts.ttl = _this.ttl;
        }
        token_data.opts = opts;
        return _this.save(token, token_data, function(err) {
          if (err != null) {
            return typeof callback === "function" ? callback(err) : void 0;
          }
          return typeof callback === "function" ? callback() : void 0;
        });
      });
    };

    TokenStore.prototype.save = function(token, token_data, callback) {
      throw new Error('token store must implement save');
    };

    TokenStore.prototype.get = function(token, opts, callback) {
      throw new Error('token store must implement get');
    };

    TokenStore.prototype.get_token_by_data = function(token_data, callback) {
      throw new Error('token store must implement get_token_by_data');
    };

    TokenStore.prototype.get_tokens_by_user = function(user_id, callback) {
      throw new Error('token store must implement get_tokens_by_user');
    };

    TokenStore.prototype.remove = function(token, callback) {
      throw new Error('token store must implement remove');
    };

    TokenStore.prototype.remove_by_data = function(token_data, callback) {
      throw new Error('token store must implement remove_by_data');
    };

    TokenStore.prototype.remove_by_user = function(user_id, callback) {
      throw new Error('token store must implement remove_by_user');
    };

    return TokenStore;

  })();

  module.exports = TokenStore;

}).call(this);
