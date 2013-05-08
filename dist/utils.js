(function() {
  var betturl;

  betturl = require('betturl');

  exports.send = function(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Length': Buffer.byteLength(data)
    });
    return res.end(data);
  };

  exports.send_html = function(res, statusCode, data) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return exports.send(res, statusCode, data);
  };

  exports.send_json = function(res, statusCode, data) {
    res.setHeader('Content-Type', 'application/json');
    return exports.send(res, statusCode, JSON.stringify(data));
  };

  exports.redirect = function(res, to) {
    res.setHeader('Location', to);
    return exports.send(res, 302, '');
  };

  exports.create_callback_url = function(keyless, req, url, ticket) {
    var matches, parsed, _ref, _ref1;
    parsed = betturl.parse(url);
    if ((_ref = parsed.protocol) == null) {
      parsed.protocol = req.resolved_protocol;
    }
    if (parsed.host == null) {
      _ref1 = req.get('host').split(':'), parsed.host = _ref1[0], parsed.port = _ref1[1];
    }
    if (parsed.port == null) {
      delete parsed.port;
    }
    if (ticket != null) {
      parsed.query.auth_ticket = ticket;
    }
    matches = keyless.config.authorized_callback_domains.filter(function(matcher) {
      if (typeof matcher === 'string') {
        return matcher === parsed.host;
      }
      if ((matcher.test != null) && typeof matcher.test === 'function') {
        return matcher.test(parsed.host);
      }
      return false;
    });
    if (matches.length === 0) {
      throw new Error('Unauthorized callback domain');
    }
    return betturl.format(parsed);
  };

  exports.upgrade_to_ssl = function(keyless, req, res, next) {
    if (keyless.config.force_ssl !== true) {
      return false;
    }
    if (req.resolved_protocol === 'https') {
      return false;
    }
    exports.redirect(res, 'https://' + req.get('host') + req.url);
    return true;
  };

  exports.login_user = function(keyless, req, res, next, user) {
    return req.logIn(user, function(err) {
      if (err != null) {
        return next(err);
      }
      return exports.create_and_send_ticket(keyless, req, res, next);
    });
  };

  exports.create_and_send_ticket = function(keyless, req, res, next) {
    var callback;
    callback = req.keyless.session.callback;
    delete req.keyless.session.callback;
    if (keyless.config.on_login != null) {
      if (callback == null) {
        callback = keyless.config.on_login;
      }
    }
    if (req.format === 'json') {
      return exports.send_json(res, 200, {
        redirect: exports.create_callback_url(keyless, req, callback)
      });
    }
    return keyless.config.ticket_store.create(req._passport.session.user, function(err, ticket) {
      if (err != null) {
        return next(err);
      }
      try {
        callback = exports.create_callback_url(keyless, req, callback, ticket);
      } catch (err) {
        req.logOut();
        return exports.send_json(res, 403, err.message);
      }
      return exports.redirect(res, callback);
    });
  };

  exports.authorize_shared_key = function(keyless, req, res, next) {
    var shared_key;
    shared_key = req.headers[keyless.config.shared_key_header];
    if (shared_key === keyless.config.shared_key) {
      return true;
    }
    exports.send_json(res, 401, 'Unauthorized');
    return false;
  };

}).call(this);
