(function() {
  var betturl, express, utils;

  express = require('express');

  betturl = require('betturl');

  utils = require('./utils');

  exports.fix_request = function(keyless) {
    return function(req, res, next) {
      var parsed, _ref, _ref1;
      parsed = betturl.parse(req.url);
      req.query = parsed.query;
      req.path = parsed.path;
      if (/\.json$/.test(req.path) || req.headers.accept === 'application/json') {
        req.format = 'json';
      }
      if ((_ref = req.format) == null) {
        req.format = 'html';
      }
      req.resolved_protocol = (_ref1 = req.get('x-forwarded-proto')) != null ? _ref1 : req.protocol;
      req.full_url = req.resolved_protocol + '://' + req.get('host') + req.url;
      return next();
    };
  };

  exports.keyless_cookie = require('./keyless_cookie');

  exports.keyless_user = function(keyless) {
    return function(req, res, next) {
      var invalid_token, _ref, _ref1;
      console.log('KEYLESS: ' + req.method + ' ' + req.url);
      console.log('KEYLESS: ' + require('util').inspect(require('underscore')(req.keyless.session).omit('cookie')));
      if (((_ref = req.keyless.session) != null ? _ref.passport : void 0) != null) {
        delete req.keyless.session.passport;
      }
      if (((_ref1 = req.keyless.session) != null ? _ref1.token : void 0) == null) {
        return next();
      }
      console.log('KEYLESS: CHECKING TOKEN');
      invalid_token = function(err) {
        delete req.keyless.session.token;
        return next(err);
      };
      return keyless.config.token_store.get(req.keyless.session.token, function(err, token_data) {
        if (err != null) {
          return invalid_token(err);
        }
        if (token_data == null) {
          return invalid_token();
        }
        console.log('KEYLESS: TOKEN DATA');
        console.log(token_data);
        return keyless.passport.deserializeUser(token_data.user_id, function(err, user) {
          if (err != null) {
            return invalid_token(err);
          }
          return utils.login_user(req.keyless.context, user, function(err) {
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
