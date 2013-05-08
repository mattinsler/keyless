(function() {
  var betturl, inflate_query_object, utils;

  betturl = require('betturl');

  utils = require('./utils');

  exports.get_login = function(keyless, req, res, next) {
    var parsed, prefix;
    if (utils.upgrade_to_ssl(req.keyless.context)) {
      return;
    }
    if (req.query.callback != null) {
      req.keyless.session.callback = req.query.callback;
    }
    if (req.keyless.user != null) {
      return utils.create_and_send_ticket(req.keyless.context);
    }
    if (keyless.config.defer_login_url != null) {
      prefix = req.resolved_protocol + '://' + req.get('host');
      parsed = betturl.parse(prefix + req.url);
      parsed.path = keyless.config.defer_login_url;
      req.url = betturl.format(parsed).slice(prefix.length);
      req.keyless.error = req.keyless.session.error;
      delete req.keyless.session.error;
      return next();
    }
    return utils.send_html(req.keyless.context, 200, keyless.config.login_html);
  };

  exports.post_login = function(keyless, req, res, next) {
    return keyless.passport.authenticate('local', function(err, user) {
      if (err != null) {
        return next(err);
      }
      if (!user) {
        req.keyless.session.error = 'User could not be authenticated';
        return utils.redirect(req.keyless.context, keyless.config.url.login);
      }
      return utils.login_user(req.keyless.context, user, function(err) {
        if (err != null) {
          return next(err);
        }
        return utils.create_and_send_ticket(req.keyless.context);
      });
    })(req, res, next);
  };

  exports.validate = function(keyless, req, res, next) {
    if (req.query.ticket != null) {
      return exports.validate_ticket(keyless, req, res, next);
    }
    if (req.query.token != null) {
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
    if (!utils.authorize_shared_key(req.keyless.context)) {
      return;
    }
    if (req.query.ticket == null) {
      return next(new Error('Must provide a ticket to validate'));
    }
    console.log(keyless.config.ticket_store);
    return keyless.config.ticket_store.get(req.query.ticket, function(err, user_id) {
      if (err != null) {
        return next(err);
      }
      if (user_id == null) {
        return utils.send_json(req.keyless.context, 401, 'Unauthorized');
      }
      return keyless.config.token_store.create(user_id, inflate_query_object(req.query), function(err, token) {
        if (err != null) {
          return next(err);
        }
        return utils.send_json(req.keyless.context, 200, {
          token: token
        });
      });
    });
  };

  exports.validate_token = function(keyless, req, res, next) {
    if (!utils.authorize_shared_key(req.keyless.context)) {
      return;
    }
    if (req.query.token == null) {
      return next(new Error('Must provide a token to validate'));
    }
    return keyless.config.token_store.get(req.query.token, function(err, token_data) {
      if (err != null) {
        return next(err);
      }
      if (token_data == null) {
        return utils.send_json(req.keyless.context, 401, 'Unauthorized');
      }
      return keyless.passport.deserializeUser(token_data.user_id, function(err, user) {
        if (err != null) {
          return next(err);
        }
        return keyless.authorize_user(user, inflate_query_object(req.query).authorization_data, function(err, response) {
          if (err != null) {
            return next(err);
          }
          if (response === true) {
            return utils.send_json(req.keyless.context, 200, {
              user: user
            });
          }
          return utils.send_json(req.keyless.context, 403, typeof response === 'string' ? response : 'Token authorization failed');
        });
      });
    });
  };

  exports.logout = function(keyless, req, res, next) {
    var done;
    done = function() {
      if (req.query.callback != null) {
        return utils.redirect(req.keyless.context, decodeURIComponent(req.query.callback));
      }
      return utils.redirect(req.keyless.context, keyless.config.url.login);
    };
    if (req.keyless.user == null) {
      return done();
    }
    return keyless.passport.serializeUser(req.keyless.user, function(err, user_id) {
      utils.logout_user(req.keyless.context);
      if (err != null) {
        return next(err);
      }
      if (user_id == null) {
        return next();
      }
      return keyless.config.token_store.remove_tokens_for_user(user_id, done);
    });
  };

}).call(this);
