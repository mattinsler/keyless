(function() {
  var betturl, express;

  express = require('express');

  betturl = require('betturl');

  exports.fix_request = function(keyless) {
    return function(req, res, next) {
      var _ref;
      req.query = betturl.parse(req.url).query;
      req.resolved_protocol = (_ref = req.get('x-forwarded-proto')) != null ? _ref : req.protocol;
      req.full_url = req.resolved_protocol + '://' + req.get('host') + req.url;
      return next();
    };
  };

  exports.cookie_parser = function(keyless) {
    return express.cookieParser();
  };

  exports.session_parser = function(keyless) {
    return express.session({
      key: keyless.config.session_key,
      secret: keyless.config.session_secret,
      store: keyless.config.session_store,
      cookie: {
        signed: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        secure: keyless.config.force_ssl
      }
    });
  };

  exports.passport_initialize = function(keyless) {
    return keyless.passport.initialize();
  };

  exports.passport_session = function(keyless) {
    return keyless.passport.session();
  };

  exports.router = function(keyless) {
    var routes;
    routes = {};
    routes['get ' + keyless.config.url.login] = keyless.routes.get_login;
    routes['post ' + keyless.config.url.login] = keyless.routes.post_login;
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
