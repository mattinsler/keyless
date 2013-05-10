(function() {
  var betturl, express, utils;

  express = require('express');

  betturl = require('betturl');

  utils = require('./utils');

  exports.fix_request = function(keyless) {
    return function(req, res, next) {
      var parsed, _base, _ref, _ref1;
      parsed = betturl.parse(req.url);
      req.keyless.server.query = parsed.query;
      req.keyless.server.path = parsed.path;
      if (/\.json$/.test(req.keyless.server.path) || req.headers.accept === 'application/json') {
        req.keyless.server.format = 'json';
      }
      if ((_ref = (_base = req.keyless.server).format) == null) {
        _base.format = 'html';
      }
      req.keyless.server.resolved_protocol = (_ref1 = req.get('x-forwarded-proto')) != null ? _ref1 : req.protocol;
      req.keyless.server.full_url = req.keyless.server.resolved_protocol + '://' + req.get('host') + req.url;
      return next();
    };
  };

  exports.keyless_cookie = require('./keyless_cookie');

  exports.keyless_user = function(keyless) {
    return function(req, res, next) {
      var invalid_token, _ref, _ref1;
      if (((_ref = req.keyless.server.session) != null ? _ref.passport : void 0) != null) {
        delete req.keyless.server.session.passport;
      }
      if (((_ref1 = req.keyless.server.session) != null ? _ref1.token : void 0) == null) {
        return next();
      }
      invalid_token = function(err) {
        delete req.keyless.server.session.token;
        return next(err);
      };
      return keyless.config.token_store.get(req.keyless.server.session.token, function(err, token_data) {
        if (err != null) {
          return invalid_token(err);
        }
        if (token_data == null) {
          return invalid_token();
        }
        return keyless.passport.deserializeUser(token_data.user_id, function(err, user) {
          if (err != null) {
            return invalid_token(err);
          }
          return utils.login_user(req.keyless.server.context, user, function(err) {
            if (err != null) {
              return invalid_token(err);
            }
            return next();
          });
        });
      });
    };
  };

  exports.router = function(keyless) {
    var routes;
    routes = {};
    routes['get ' + keyless.config.url.login] = keyless.routes.get_login;
    routes['post ' + keyless.config.url.login] = keyless.routes.post_login;
    routes['post ' + keyless.config.url.login + '.json'] = keyless.routes.post_login;
    routes['get ' + keyless.config.url.logout] = keyless.routes.logout;
    routes['get ' + keyless.config.url.validate] = keyless.routes.validate;
    return function(req, res, next) {
      var route;
      route = routes[req.method.toLowerCase() + ' ' + req.url.split('?')[0]];
      if (route == null) {
        return next();
      }
      return route(keyless, req, res, next);
    };
  };

}).call(this);
