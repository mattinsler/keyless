(function() {
  var Keyless, Path, async, betturl, express, ticket_stores, walkabout;

  Path = require('path');

  async = require('async');

  express = require('express');

  betturl = require('betturl');

  walkabout = require('walkabout');

  ticket_stores = {};

  walkabout(__dirname).join('ticket_stores').readdir_sync().forEach(function(file) {
    if (file.extension !== 'js') {
      return;
    }
    return ticket_stores[file.basename] = file.require();
  });

  Keyless = (function() {

    function Keyless(opts) {
      var _base, _base1, _base2, _base3, _base4, _base5, _base6, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      this.opts = opts != null ? opts : {};
      if ((_ref = (_base = this.opts).root_url) == null) {
        _base.root_url = '/';
      }
      if (this.opts.root_url[0] !== '/') {
        this.opts.root_url = '/' + this.opts.root_url;
      }
      if ((_ref1 = (_base1 = this.opts).shared_key_header) == null) {
        _base1.shared_key_header = 'x-keyless-sso';
      }
      if ((_ref2 = (_base2 = this.opts).shared_key) == null) {
        _base2.shared_key = '59b325af9e266d0285bc1f0840a5e89915a3105c36f19bae58f5176b15476d05';
      }
      if ((_ref3 = (_base3 = this.opts).login_html_file) == null) {
        _base3.login_html_file = '';
      }
      if ((_ref4 = (_base4 = this.opts).session_key) == null) {
        _base4.session_key = 'keyless.sid';
      }
      if ((_ref5 = (_base5 = this.opts).session_secret) == null) {
        _base5.session_secret = 'b3dbc47c1cd6b210ab3312aa3804f47d07f15dd5ba50907b0bf5b49da8a02483';
      }
      if ((_ref6 = (_base6 = this.opts).ticket_store) == null) {
        _base6.ticket_store = ticket_stores.memory();
      }
      this.login_url = Path.join(this.opts.root_url, 'login');
      this.logout_url = Path.join(this.opts.root_url, 'logout');
      this.validate_url = Path.join(this.opts.root_url, 'validate');
      try {
        this.login_html = walkabout(this.opts.login_html_file).read_file_sync('utf8');
      } catch (e) {
        console.error('Keyless: Must pass a valid login_html_file');
        process.exit(1);
      }
      this.passport = this.opts.passport;
      if (this.passport == null) {
        this.passport = require('passport');
      }
      this.passport_initialize = this.passport.initialize();
      this.passport_session = this.passport.session();
      this.cookie_parser = express.cookieParser();
      this.session_parser = express.session({
        key: this.opts.session_key,
        secret: this.opts.session_secret,
        store: this.opts.session_store,
        cookie: {
          maxAge: 1000 * 60 * 60 * 24,
          httpOnly: true,
          signed: true
        }
      });
    }

    Keyless.prototype.send = function(res, statusCode, data) {
      res.writeHead(statusCode, {
        'Content-Length': Buffer.byteLength(data)
      });
      return res.end(data);
    };

    Keyless.prototype.send_html = function(res, statusCode, data) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return this.send(res, statusCode, data);
    };

    Keyless.prototype.send_json = function(res, statusCode, data) {
      res.setHeader('Content-Type', 'application/json');
      return this.send(res, statusCode, JSON.stringify(data));
    };

    Keyless.prototype.redirect = function(res, to) {
      res.setHeader('Location', to);
      return this.send(res, 302, '');
    };

    Keyless.prototype.routing_middleware = function(req, res, next) {
      var url;
      url = req.url.split('?')[0];
      if (url === this.login_url && req.method === 'GET') {
        return this.handle_login_get(req, res, next);
      }
      if (url === this.login_url && req.method === 'POST') {
        return this.handle_login_post(req, res, next);
      }
      if (url === this.logout_url && req.method === 'GET') {
        return this.handle_logout(req, res, next);
      }
      if (url === this.validate_url && req.method === 'GET') {
        return this.handle_validate(req, res, next);
      }
      return next();
    };

    Keyless.prototype.parse_querystring = function(req, res, next) {
      req.query = betturl.parse(req.url).query;
      return next();
    };

    Keyless.prototype.middleware = function() {
      var _this = this;
      return function(req, res, next) {
        req.keyless = {};
        return async.series([
          function(cb) {
            return _this.parse_querystring(req, res, cb);
          }, function(cb) {
            return _this.cookie_parser(req, res, cb);
          }, function(cb) {
            return _this.session_parser(req, res, cb);
          }, function(cb) {
            return _this.passport_initialize(req, res, cb);
          }, function(cb) {
            return _this.passport_session(req, res, cb);
          }, function(cb) {
            return _this.routing_middleware(req, res, cb);
          }
        ], next);
      };
    };

    Keyless.prototype.create_callback_url = function(url, ticket) {
      var parsed;
      parsed = betturl.parse(url);
      parsed.query.ticket = ticket;
      return betturl.format(parsed);
    };

    Keyless.prototype.create_and_send_ticket = function(req, res, next) {
      var callback,
        _this = this;
      callback = req.session.callback;
      delete req.session.callback;
      return this.opts.ticket_store.create(req._passport.session.user, function(err, ticket) {
        if (err != null) {
          return next(err);
        }
        callback = _this.create_callback_url(callback, ticket);
        return _this.redirect(res, callback);
      });
    };

    Keyless.prototype.login_user = function(req, res, next, user) {
      var _this = this;
      return req.logIn(user, function(err) {
        if (err != null) {
          return next(err);
        }
        return _this.create_and_send_ticket(req, res, next);
      });
    };

    Keyless.prototype.handle_login_get = function(req, res, next) {
      if ((req.query.callback != null) && !(req.session.callback != null)) {
        req.session.callback = req.query.callback;
      }
      if (req.isAuthenticated()) {
        return this.create_and_send_ticket(req, res, next);
      }
      return this.send_html(res, 200, this.login_html);
    };

    Keyless.prototype.handle_login_post = function(req, res, next) {
      var _this = this;
      return this.passport.authenticate('local', function(err, user) {
        if (err != null) {
          return next(res, err);
        }
        if (!user) {
          return _this.redirect(res, _this.login_url);
        }
        return _this.login_user(req, res, next, user);
      })(req, res, next);
    };

    Keyless.prototype.handle_logout = function(req, res, next) {
      req.logOut();
      if (req.query.callback != null) {
        return this.redirect(res, decodeURIComponent(req.query.callback));
      }
      return this.redirect(res, this.login_url);
    };

    Keyless.prototype.handle_validate = function(req, res, next) {
      var shared_key,
        _this = this;
      shared_key = req.headers[this.opts.shared_key_header];
      if (shared_key !== this.opts.shared_key) {
        return this.send_json(res, 401, 'Unauthorized');
      }
      if (req.query.ticket == null) {
        return next(new Error('Must provide a ticket to validate'));
      }
      return this.opts.ticket_store.get(req.query.ticket, function(err, user_id) {
        if (err != null) {
          return next(err);
        }
        if (user_id == null) {
          return _this.send_json(res, 401, 'Unauthorized');
        }
        return req._passport.instance.deserializeUser(user_id, function(err, user) {
          if (err != null) {
            return next(err);
          }
          return _this.send_json(res, 200, {
            user: user
          });
        });
      });
    };

    return Keyless;

  })();

  module.exports = function(opts) {
    return new Keyless(opts);
  };

  module.exports.TicketStore = ticket_stores;

}).call(this);
