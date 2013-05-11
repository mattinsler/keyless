(function() {
  var MemoryTokenStore, TokenStore,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TokenStore = require('../token_store');

  MemoryTokenStore = (function(_super) {

    __extends(MemoryTokenStore, _super);

    function MemoryTokenStore(opts) {
      if (opts == null) {
        opts = {};
      }
      MemoryTokenStore.__super__.constructor.apply(this, arguments);
      this.tokens = {};
      this.tokens_by_data = {};
    }

    MemoryTokenStore.prototype.save = function(token, token_data, callback) {
      var token_data_str;
      token_data_str = JSON.stringify(token_data);
      this.tokens[key] = token_data;
      this.tokens_by_data[token_data_str] = token;
      return typeof callback === "function" ? callback() : void 0;
    };

    MemoryTokenStore.prototype.get = function(token, callback) {
      return callback(null, this.tokens[token]);
    };

    MemoryTokenStore.prototype.get_token_by_data = function(token_data, callback) {
      return callback(null, this.tokens_by_data[JSON.stringify(token_data)]);
    };

    MemoryTokenStore.prototype.get_tokens_by_user = function(user_id, callback) {
      var _this = this;
      return Object.keys(this.tokens).filter(function(t) {
        return _this.tokens[t].user_id.toString() === user_id.toString();
      });
    };

    MemoryTokenStore.prototype.remove = function(token, callback) {
      var token_data, token_data_str;
      token_data = this.tokens[token];
      if (token_data == null) {
        return typeof callback === "function" ? callback() : void 0;
      }
      token_data_str = JSON.stringify(token_data);
      delete this.tokens[token];
      delete this.tokens_by_data[token_data_str];
      return typeof callback === "function" ? callback() : void 0;
    };

    MemoryTokenStore.prototype.remove_by_data = function(token_data, callback) {
      var token, token_data_str;
      token_data_str = JSON.stringify(token_data);
      token = this.tokens_by_data[token_data_str];
      delete this.tokens[token];
      delete this.tokens_by_data[token_data_str];
      return typeof callback === "function" ? callback() : void 0;
    };

    MemoryTokenStore.prototype.remove_by_user = function(user_id, callback) {
      var _this = this;
      Object.keys(this.tokens).filter(function(t) {
        return _this.tokens[t].user_id.toString() === user_id.toString();
      }).forEach(function(t) {
        return _this.remove(t);
      });
      return callback();
    };

    return MemoryTokenStore;

  })(TokenStore);

  module.exports = function(opts) {
    return new MemoryTokenStore(opts);
  };

}).call(this);
