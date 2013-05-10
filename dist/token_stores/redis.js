(function() {
  var RedisTokenStore, crypto, redis_builder;

  crypto = require('crypto');

  redis_builder = require('redis-builder');

  RedisTokenStore = (function() {

    function RedisTokenStore(opts) {
      var _ref, _ref1;
      if (opts == null) {
        opts = {};
      }
      this.client = redis_builder(opts);
      this.prefix = (_ref = opts.prefix) != null ? _ref : 'keyless-t:';
      this.expiration = (_ref1 = opts.expiration) != null ? _ref1 : 60 * 60 * 24;
    }

    RedisTokenStore.prototype.create = function(user_id, opts, callback) {
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
      return this.client.multi().setex(this.prefix + key, this.expiration, JSON.stringify(token_data)).sadd(this.prefix + 'u:' + user_id, key).expire(this.prefix + 'u:' + user_id, this.expiration).exec(function(err) {
        if (err != null) {
          return callback(err);
        }
        return callback(null, key);
      });
    };

    RedisTokenStore.prototype.get = function(token, callback) {
      var _this = this;
      return this.client.multi().get(this.prefix + token, function(err, token_data) {
        if (err != null) {
          return callback(err);
        }
        if (token_data == null) {
          return callback();
        }
        try {
          token_data = JSON.parse(token_data);
          _this.client.expire(_this.prefix + 'u:' + token_data.user_id, _this.expiration);
          return callback(null, token_data);
        } catch (e) {
          return callback(e);
        }
      }).expire(this.prefix + token, this.expiration).exec();
    };

    RedisTokenStore.prototype.remove_token = function(token, callback) {
      var _this = this;
      return this.client.multi().get(this.prefix + token, function(err, token_data) {
        try {
          token_data = JSON.parse(token_data);
          return _this.client.srem(_this.prefix + 'u:' + token_data.user_id, token);
        } catch (e) {

        }
      }).del(this.prefix + token).exec(callback);
    };

    RedisTokenStore.prototype.remove_tokens_for_user = function(user_id, callback) {
      var _this = this;
      return this.client.multi().smembers(this.prefix + 'u:' + user_id, function(err, tokens) {
        if (err != null) {
          return callback(err);
        }
        if (!((tokens != null ? tokens.length : void 0) > 0)) {
          return callback();
        }
        return _this.client.del(tokens.map(function(t) {
          return _this.prefix + t;
        }), callback);
      }).del().exec();
    };

    return RedisTokenStore;

  })();

  module.exports = function(opts) {
    return new RedisTokenStore(opts);
  };

}).call(this);
