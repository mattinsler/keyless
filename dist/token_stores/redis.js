(function() {
  var RedisTokenStore, TokenStore, async, redis_builder,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  async = require('async');

  TokenStore = require('../token_store');

  redis_builder = require('redis-builder');

  RedisTokenStore = (function(_super) {

    __extends(RedisTokenStore, _super);

    function RedisTokenStore(opts) {
      var _ref;
      if (opts == null) {
        opts = {};
      }
      RedisTokenStore.__super__.constructor.apply(this, arguments);
      this.client = redis_builder(opts.redis);
      this.prefix = ((_ref = opts.redis) != null ? _ref.prefix : void 0) || 'keyless-t:';
    }

    RedisTokenStore.prototype._get_token_data_str = function(token, callback) {
      return this.client.get(this.prefix + token, callback);
    };

    RedisTokenStore.prototype._extend_ttl = function(token, token_data, token_data_str, callback) {
      var multi, ttl;
      ttl = token_data.opts.ttl || this.ttl;
      multi = this.client.multi();
      if (ttl === -1) {
        multi = multi.persist(this.prefix + token).persist(this.prefix + 'd:' + token_data_str);
      } else {
        multi = multi.expire(this.prefix + token, ttl).expire(this.prefix + 'd:' + token_data_str, ttl);
      }
      return multi.exec(function(err) {
        return typeof callback === "function" ? callback(err) : void 0;
      });
    };

    RedisTokenStore.prototype.save = function(token, token_data, callback) {
      var multi, token_data_str, ttl;
      ttl = token_data.opts.ttl;
      token_data_str = JSON.stringify(token_data);
      multi = this.client.multi().sadd(this.prefix + 'u:' + token_data.user_id, token).persist(this.prefix + 'u:' + token_data.user_id);
      if (ttl === -1) {
        multi = multi.set(this.prefix + token, token_data_str).set(this.prefix + 'd:' + token_data_str, token);
      } else {
        multi = multi.setex(this.prefix + token, ttl, token_data_str).setex(this.prefix + 'd:' + token_data_str, ttl, token);
      }
      return multi.exec(function(err) {
        return typeof callback === "function" ? callback(err) : void 0;
      });
    };

    RedisTokenStore.prototype.get = function(token, opts, callback) {
      var _this = this;
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return this._get_token_data_str(token, function(err, token_data_str) {
        var token_data;
        if (err != null) {
          return callback(err);
        }
        if (token_data_str == null) {
          return callback();
        }
        try {
          token_data = JSON.parse(token_data_str);
          if (opts.extend_ttl !== false) {
            _this._extend_ttl(token, token_data, token_data_str);
          }
          return callback(null, token_data);
        } catch (err) {
          _this.remove(token, token_data_str);
          return callback(err);
        }
      });
    };

    RedisTokenStore.prototype.get_token_by_data = function(token_data, callback) {
      return this.client.get(this.prefix + 'd:' + JSON.stringify(token_data), callback);
    };

    RedisTokenStore.prototype.get_tokens_by_user = function(user_id, callback) {
      return this.client.smembers(this.prefix + 'u:' + user_id, callback);
    };

    RedisTokenStore.prototype.remove = function(token, token_data_str, callback) {
      var do_remove,
        _this = this;
      if (typeof token_data_str === 'function') {
        callback = token_data_str;
        token_data_str = null;
      }
      do_remove = function(token, token_data_str) {
        var token_data;
        try {
          if (token_data_str != null) {
            token_data = JSON.parse(token_data_str);
          }
        } catch (e) {

        }
        if ((token_data != null ? token_data.user_id : void 0) != null) {
          return _this.client.multi().del([_this.prefix + token, _this.prefix + 'd:' + token_data_str]).srem(_this.prefix + 'u:' + token_data.user_id, token).exec(function(err) {
            return typeof callback === "function" ? callback(err) : void 0;
          });
        } else {
          return _this.client.del([_this.prefix + token, _this.prefix + 'd:' + token_data_str], function(err) {
            return typeof callback === "function" ? callback(err) : void 0;
          });
        }
      };
      if (token_data_str != null) {
        return do_remove(token, token_data_str);
      }
      return this._get_token_data_str(token, function(err, token_data_str) {
        if (err != null) {
          return callback(err);
        }
        return do_remove(token, token_data_str);
      });
    };

    RedisTokenStore.prototype.remove_if = function(token, predicate, callback) {
      var do_remove,
        _this = this;
      do_remove = function(token, token_data_str) {
        var token_data;
        try {
          if (token_data_str != null) {
            token_data = JSON.parse(token_data_str);
          }
        } catch (e) {

        }
        if (!predicate(token_data)) {
          return callback();
        }
        return _this.client.multi().del([_this.prefix + token, _this.prefix + 'd:' + token_data_str]).srem(_this.prefix + 'u:' + token_data.user_id, token).exec(function(err) {
          return typeof callback === "function" ? callback(err) : void 0;
        });
      };
      return this._get_token_data_str(token, function(err, token_data_str) {
        if (err != null) {
          return callback(err);
        }
        return do_remove(token, token_data_str);
      });
    };

    RedisTokenStore.prototype.remove_by_data = function(token_data, callback) {
      var token_data_str,
        _this = this;
      token_data_str = JSON.stringify(token_data);
      return this.get_token_by_data(token_data, function(err, token) {
        if (err != null) {
          return callback(err);
        }
        if (token == null) {
          return callback();
        }
        return _this.remove(token, token_data_str, callback);
      });
    };

    RedisTokenStore.prototype.remove_by_user_type = function(user_id, type, callback) {
      var predicate,
        _this = this;
      predicate = function(token_data) {
        return token_data.opts.type === type;
      };
      return this.client.smembers(this.prefix + 'u:' + user_id, function(err, tokens) {
        if (err != null) {
          return callback(err);
        }
        if (tokens == null) {
          return callback();
        }
        return async.each(tokens, function(token, cb) {
          return _this.remove_if(token, predicate, cb);
        }, function(err) {
          return typeof callback === "function" ? callback(err) : void 0;
        });
      });
    };

    RedisTokenStore.prototype.remove_by_user = function(user_id, callback) {
      var _this = this;
      return this.client.smembers(this.prefix + 'u:' + user_id, function(err, tokens) {
        if (err != null) {
          return callback(err);
        }
        if (tokens == null) {
          return callback();
        }
        return async.each(tokens, function(token, cb) {
          return _this.remove(token, cb);
        }, function(err) {
          if (typeof callback === "function") {
            callback(err);
          }
          return _this.client.del(_this.prefix + 'u:' + user_id, function() {});
        });
      });
    };

    return RedisTokenStore;

  })(TokenStore);

  module.exports = function(opts) {
    return new RedisTokenStore(opts);
  };

}).call(this);
