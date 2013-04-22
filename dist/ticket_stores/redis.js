(function() {
  var RedisTicketStore, build_redis_client, crypto;

  crypto = require('crypto');

  build_redis_client = function(config) {
    var client, database, host, password, port, url_config, url_password, url_username, username, _ref;
    if (config == null) {
      config = {};
    }
    if (config.client != null) {
      return config.client;
    }
    if (config.url != null) {
      url_config = require('url').parse(config.url);
    }
    if ((url_config != null ? url_config.auth : void 0) != null) {
      _ref = url_config.auth.split(':'), url_username = _ref[0], url_password = _ref[1];
    }
    host = (url_config != null ? url_config.hostname : void 0) || config.host || 'localhost';
    port = (url_config != null ? url_config.port : void 0) || config.port || 6379;
    database = (url_config != null ? url_config.pathname.slice(1) : void 0) || config.database;
    username = url_username || config.username;
    password = url_password || config.password;
    client = require('redis').createClient(port, host);
    if (password != null) {
      client.auth(password);
    }
    if (database != null) {
      if (parseInt(database).toString() !== database.toString()) {
        throw new Error('Database must be an integer');
      }
      client.select(parseInt(database));
    }
    return client;
  };

  RedisTicketStore = (function() {

    function RedisTicketStore(opts) {
      var _ref;
      if (opts == null) {
        opts = {};
      }
      this.client = build_redis_client(opts);
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
