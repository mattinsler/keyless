(function() {
  var Cookie, connect_utils, cookie_util, crc32, signature;

  crc32 = require('express/node_modules/buffer-crc32');

  cookie_util = require('express/node_modules/cookie');

  Cookie = require('express/node_modules/connect/lib/middleware/session/cookie');

  signature = require('express/node_modules/cookie-signature');

  connect_utils = require('express/node_modules/connect/lib/utils');

  module.exports = function(keyless) {
    return function(req, res, next) {
      var cookie, cookies, session_hash, signed_cookies;
      if (req.keyless.server.session != null) {
        return next();
      }
      cookies = req.headers.cookie;
      if (cookies != null) {
        try {
          signed_cookies = connect_utils.parseSignedCookies(cookie_util.parse(cookies), keyless.config.session_secret);
          signed_cookies = connect_utils.parseJSONCookies(signed_cookies);
        } catch (err) {
          err.status = 400;
          return next(err);
        }
      }
      req.keyless.server.session = (signed_cookies != null ? signed_cookies[keyless.config.session_key] : void 0) || {};
      if (typeof req.keyless.server.session !== 'object') {
        req.keyless.server.session = {};
      }
      session_hash = crc32.signed(JSON.stringify(req.keyless.server.session));
      cookie = req.keyless.server.session.cookie = new Cookie({
        signed: true,
        httpOnly: true,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24,
        secure: keyless.config.force_ssl
      });
      if (req.originalUrl.indexOf(cookie.path) !== 0) {
        return next();
      }
      res.on('header', function() {
        var cookie_value, session_str;
        if (req.keyless.server.session == null) {
          cookie.expires = new Date(0);
          res.setHeader('Set-Cookie', cookie.serialize(keyless.config.session_key, ''));
          return;
        }
        delete req.keyless.server.session.cookie;
        session_str = JSON.stringify(req.keyless.server.session);
        if (session_hash === crc32.signed(session_str)) {
          return;
        }
        session_str = 'j:' + session_str;
        cookie_value = cookie.serialize(keyless.config.session_key, 's:' + signature.sign(session_str, keyless.config.session_secret));
        return res.setHeader('Set-Cookie', cookie_value);
      });
      return next();
    };
  };

}).call(this);
