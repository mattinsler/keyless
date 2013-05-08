(function() {
  var betturl, express;

  express = require('express');

  betturl = require('betturl');

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

  exports.passport_initialize = function(keyless) {
    return function(req, res, next) {
      var passport;
      passport = keyless.passport;
      req._passport = {
        instance: passport
      };
      if (req.keyless.session && req.keyless.session[passport._key]) {
        req._passport.session = req.keyless.session[passport._key];
      } else if (req.keyless.session) {
        req.keyless.session[passport._key] = {};
        req._passport.session = req.keyless.session[passport._key];
      } else {
        req._passport.session = {};
      }
      return next();
    };
  };

  exports.passport_session = function(keyless) {
    return keyless.passport.session();
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
