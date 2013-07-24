(function() {
  var betturl, get_callback_from_querystring, inflate_query_object, utils;

  betturl = require('betturl');

  utils = require('./utils');

  get_callback_from_querystring = function(keyless, req) {
    var k, _i, _len, _ref;
    _ref = keyless.config.querystring_callback_params;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      if (req.keyless.server.query[k] != null) {
        return decodeURIComponent(req.keyless.server.query[k]);
      }
    }
  };

  exports.get_login = function(keyless, req, res, next) {
    var new_callback, parsed, prefix, _ref;
    if (utils.upgrade_to_ssl(req.keyless.server.context)) {
      return;
    }
    new_callback = get_callback_from_querystring(keyless, req);
    if (new_callback != null) {
      req.keyless.server.session.callback = new_callback;
    }
    if (req.keyless.server.user != null) {
      return utils.create_and_send_ticket(req.keyless.server.context);
    }
    if (keyless.config.defer_login_url != null) {
      prefix = req.keyless.server.resolved_protocol + '://' + req.get('host');
      parsed = betturl.parse(prefix + req.url);
      parsed.path = keyless.config.defer_login_url;
      req.url = betturl.format(parsed).slice(prefix.length);
      if (((_ref = req.keyless.server.session) != null ? _ref.error : void 0) != null) {
        req.keyless.server.error = req.keyless.server.session.error;
        delete req.keyless.server.session.error;
      }
      return next();
    }
    return utils.send_html(req.keyless.server.context, 200, keyless.config.login_html);
  };

  exports.post_login = function(keyless, req, res, next) {
    return keyless.passport.authenticate('local', function(err, user) {
      if (err != null) {
        return next(err);
      }
      if (!user) {
        if (req.keyless.server.format === 'json') {
          return utils.send_json(req.keyless.server.context, 401, {
            error: 'User could not be authenticated'
          });
        }
        req.keyless.server.session.error = 'User could not be authenticated';
        return utils.redirect(req.keyless.server.context, keyless.config.url.login);
      }
      return utils.login_user(req.keyless.server.context, user, function(err) {
        if (err != null) {
          return next(err);
        }
        return utils.create_and_send_ticket(req.keyless.server.context);
      });
    })(req, res, next);
  };

  exports.validate = function(keyless, req, res, next) {
    if (req.keyless.server.query.ticket != null) {
      return exports.validate_ticket(keyless, req, res, next);
    }
    if (req.keyless.server.query.token != null) {
      return exports.validate_token(keyless, req, res, next);
    }
    return next();
  };

  inflate_query_object = function(query) {
    var k, v;
    for (k in query) {
      v = query[k];
      if (typeof v === 'string' && /^\{.*\}$/.test(v)) {
        query[k] = JSON.parse(v);
      }
    }
    return query;
  };

  exports.validate_ticket = function(keyless, req, res, next) {
    if (!utils.authorize_shared_key(req.keyless.server.context)) {
      return;
    }
    if (req.keyless.server.query.ticket == null) {
      return next(new Error('Must provide a ticket to validate'));
    }
    return keyless.config.ticket_store.get(req.keyless.server.query.ticket, function(err, user_id) {
      if (err != null) {
        return next(err);
      }
      if (user_id == null) {
        return utils.send_json(req.keyless.server.context, 401, 'Unauthorized');
      }
      return keyless.config.token_store.create(user_id, {
        type: 'web'
      }, function(err, token) {
        if (err != null) {
          return next(err);
        }
        return utils.send_json(req.keyless.server.context, 200, {
          token: token
        });
      });
    });
  };

  exports.validate_token = function(keyless, req, res, next) {
    if (!utils.authorize_shared_key(req.keyless.server.context)) {
      return;
    }
    if (req.keyless.server.query.token == null) {
      return next(new Error('Must provide a token to validate'));
    }
    return keyless.config.token_store.get(req.keyless.server.query.token, function(err, token_data) {
      if (err != null) {
        return next(err);
      }
      if (token_data == null) {
        return utils.send_json(req.keyless.server.context, 401, 'Unauthorized');
      }
      return keyless.passport.deserializeUser(token_data.user_id, function(err, user) {
        if (err != null) {
          return next(err);
        }
        return keyless.authorize_user(user, inflate_query_object(req.keyless.server.query).authorization_data, function(err, response) {
          if (err != null) {
            return next(err);
          }
          if (response === true) {
            return utils.send_json(req.keyless.server.context, 200, {
              user: user
            });
          }
          return utils.send_json(req.keyless.server.context, 403, typeof response === 'string' ? response : 'Token authorization failed');
        });
      });
    });
  };

  exports.logout = function(keyless, req, res, next) {
    var done;
    done = function() {
      var callback;
      callback = get_callback_from_querystring(keyless, req);
      if (callback != null) {
        return utils.redirect(req.keyless.server.context, callback);
      }
      return utils.redirect(req.keyless.server.context, keyless.config.url.login);
    };
    if (req.keyless.server.user == null) {
      return done();
    }
    return keyless.passport.serializeUser(req.keyless.server.user, function(err, user_id) {
      utils.logout_user(req.keyless.server.context);
      if (err != null) {
        return next(err);
      }
      if (user_id == null) {
        return next();
      }
      return keyless.config.token_store.remove_by_user_type(user_id, 'web', done);
    });
  };

}).call(this);
