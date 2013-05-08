(function() {
  var Cookie, connect_utils, cookie, signature;

  cookie = require('express/node_modules/cookie');

  Cookie = require('express/node_modules/connect/lib/middleware/session/cookie');

  signature = require('express/node_modules/cookie-signature');

  connect_utils = require('express/node_modules/connect/lib/utils');

  module.exports = function(keyless) {
    return function(req, res, next) {
      var cookies, signed_cookies;
      if (req.keyless.session != null) {
        return next();
      }
      cookies = req.headers.cookie;
      if (cookies == null) {
        return next();
      }
      try {
        signed_cookies = connect_utils.parseSignedCookies(cookie.parse(cookies), keyless.config.session_secret);
        signed_cookies = connect_utils.parseJSONCookies(signed_cookies);
      } catch (err) {
        err.status = 400;
        return next(err);
      }
      req.keyless.session = signed_cookies[keyless.config.session_key] || {};
      if (typeof req.keyless.session !== 'object') {
        req.keyless.session = {};
      }
      req.keyless.session.cookie = new Cookie({
        signed: true,
        httpOnly: true,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24,
        secure: keyless.config.force_ssl
      });
      res.on('header', function() {
        var cookie_value, json;
        if (req.keyless.session == null) {
          req.keyless.session.cookie.expires = new Date(0);
          res.setHeader('Set-Cookie', cookie.serialize(keyless.config.session_key, ''));
          return;
        }
        delete req.keyless.session.cookie;
        json = 'j:' + JSON.stringify(req.keyless.session);
        cookie_value = cookie.serialize(keyless.config.session_key, 's:' + signature.sign(json, keyless.config.session_secret));
        return res.setHeader('Set-Cookie', cookie_value);
      });
      return next();
    };
  };

}).call(this);
