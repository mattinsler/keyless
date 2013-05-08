(function() {
  var betturl;

  betturl = require('betturl');

  exports.send = function(context, statusCode, data) {
    context.res.writeHead(statusCode, {
      'Content-Length': Buffer.byteLength(data)
    });
    return context.res.end(data);
  };

  exports.send_html = function(context, statusCode, data) {
    context.res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return exports.send(context, statusCode, data);
  };

  exports.send_json = function(context, statusCode, data) {
    context.res.setHeader('Content-Type', 'application/json');
    return exports.send(context, statusCode, JSON.stringify(data));
  };

  exports.redirect = function(context, to) {
    context.res.setHeader('Location', to);
    return exports.send(context, 302, '');
  };

  exports.create_callback_url = function(context, url, ticket) {
    var matches, parsed, _ref, _ref1;
    parsed = betturl.parse(url);
    if ((_ref = parsed.protocol) == null) {
      parsed.protocol = context.req.resolved_protocol;
    }
    if (parsed.host == null) {
      _ref1 = context.req.get('host').split(':'), parsed.host = _ref1[0], parsed.port = _ref1[1];
    }
    if (parsed.port == null) {
      delete parsed.port;
    }
    parsed.query.auth_ticket = ticket;
    matches = context.keyless.config.authorized_callback_domains.filter(function(matcher) {
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

  exports.upgrade_to_ssl = function(context) {
    if (context.keyless.config.force_ssl !== true) {
      return false;
    }
    if (context.req.resolved_protocol === 'https') {
      return false;
    }
    exports.redirect(context, 'https://' + context.req.get('host') + context.req.url);
    return true;
  };

  exports.login_user = function(context, user, callback) {
    console.log('KEYLESS: login_user');
    if (context.req.keyless.session.token != null) {
      context.req.keyless.user = user;
      return callback();
    }
    return context.keyless.passport.serializeUser(user, function(err, id) {
      if (err != null) {
        return callback(err);
      }
      return context.keyless.config.token_store.create(id, {
        type: 'web'
      }, function(err, token) {
        if (err != null) {
          return callback(err);
        }
        context.req.keyless.user = user;
        context.req.keyless.session.token = token;
        return callback();
      });
    });
  };

  exports.logout_user = function(context) {
    context.req.keyless.user = null;
    return delete context.req.keyless.session.token;
  };

  exports.create_and_send_ticket = function(context) {
    var callback;
    console.log('KEYLESS: create_and_send_ticket');
    callback = context.req.keyless.session.callback;
    delete context.req.keyless.session.callback;
    if (context.keyless.config.on_login != null) {
      if (callback == null) {
        callback = context.keyless.config.on_login;
      }
    }
    return context.keyless.config.ticket_store.create(context.req.keyless.session.user, function(err, ticket) {
      if (err != null) {
        return context.next(err);
      }
      try {
        callback = exports.create_callback_url(context, callback, ticket);
      } catch (err) {
        exports.logout_user(context);
        return exports.send_json(context, 403, err.message);
      }
      return exports.redirect(context, callback);
    });
  };

  exports.authorize_shared_key = function(context) {
    var shared_key;
    shared_key = context.req.headers[context.keyless.config.shared_key_header];
    if (shared_key === context.keyless.config.shared_key) {
      return true;
    }
    exports.send_json(context, 401, 'Unauthorized');
    return false;
  };

}).call(this);
