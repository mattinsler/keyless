(function() {
  var Keyless, LocalStrategy, TicketStore, TokenStore, async, configuration, middleware, routes, utils;

  async = require('async');

  LocalStrategy = require('passport-local').Strategy;

  module.exports = function(opts) {
    return new Keyless(opts);
  };

  utils = module.exports.utils = require('./utils');

  routes = module.exports.routes = require('./routes');

  middleware = module.exports.middleware = require('./middleware');

  configuration = module.exports.configuration = require('./configuration');

  TicketStore = module.exports.TicketStore = require('./ticket_stores');

  TokenStore = module.exports.TokenStore = require('./token_stores');

  Keyless = (function() {

    function Keyless(opts) {
      var _base, _base1, _ref, _ref1;
      if (opts == null) {
        opts = {};
      }
      try {
        this.config = configuration(opts);
        if ((_ref = (_base = this.config).ticket_store) == null) {
          _base.ticket_store = TicketStore.memory();
        }
        if ((_ref1 = (_base1 = this.config).token_store) == null) {
          _base1.token_store = TokenStore.memory();
        }
      } catch (err) {
        throw new Error('Keyless: ' + err.message);
      }
      this.passport = require('passport');
      this.__defineSetter__('authenticate_user', function(v) {
        return this.passport.use(new LocalStrategy(v));
      });
      this.__defineSetter__('get_id_from_user', function(v) {
        this.passport._serializers = [];
        return this.passport.serializeUser(v);
      });
      this.__defineSetter__('get_user_from_id', function(v) {
        this.passport._deserializers = [];
        return this.passport.deserializeUser(v);
      });
      this.authenticate_user = function(username, password, done) {
        return done(new Error('Implement keyless.authenticate_user'));
      };
      this.get_id_from_user = function(user, done) {
        return done(new Error('Implement keyless.get_id_from_user'));
      };
      this.get_user_from_id = function(id, done) {
        return done(new Error('Implement keyless.get_user_from_id'));
      };
      this.authorize_user = function(user, token_data, done) {
        return done(null, true);
      };
      this.routes = routes;
      this.middleware_stack = [middleware.fix_request(this), middleware.keyless_cookie(this), middleware.keyless_user(this), middleware.router(this)];
    }

    Keyless.prototype.middleware = function() {
      var _this = this;
      return function(req, res, next) {
        var _base, _ref, _ref1;
        if ((_ref = req.keyless) == null) {
          req.keyless = {};
        }
        if ((_ref1 = (_base = req.keyless).server) == null) {
          _base.server = {};
        }
        req.keyless.server.context = {
          keyless: _this,
          req: req,
          res: res
        };
        return async.eachSeries(_this.middleware_stack, function(layer, cb) {
          req.keyless.server.context.next = cb;
          return layer(req, res, cb);
        }, next);
      };
    };

    return Keyless;

  })();

}).call(this);
