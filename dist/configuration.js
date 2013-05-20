(function() {
  var path, walkabout;

  path = require('path');

  walkabout = require('walkabout');

  module.exports = function(opts) {
    var config, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
    config = {};
    config.url = {
      root: (_ref = opts.root_url) != null ? _ref : '/'
    };
    if (config.url.root[0] !== '/') {
      config.url.root = '/' + config.url.root;
    }
    config.url.login = path.join(config.url.root, 'login');
    config.url.logout = path.join(config.url.root, 'logout');
    config.url.validate = path.join(config.url.root, 'validate');
    config.shared_key = (_ref1 = opts.shared_key) != null ? _ref1 : '59b325af9e266d0285bc1f0840a5e89915a3105c36f19bae58f5176b15476d05';
    config.shared_key_header = (_ref2 = opts.shared_key_header) != null ? _ref2 : 'x-keyless-sso';
    config.session_key = (_ref3 = opts.session_key) != null ? _ref3 : 'keyless.sid';
    config.session_secret = (_ref4 = opts.session_secret) != null ? _ref4 : 'b3dbc47c1cd6b210ab3312aa3804f47d07f15dd5ba50907b0bf5b49da8a02483';
    config.force_ssl = (_ref5 = opts.force_ssl) != null ? _ref5 : (process.env.NODE_ENV === 'production' ? true : false);
    config.authorized_callback_domains = (_ref6 = opts.authorized_callback_domains) != null ? _ref6 : [/.*/];
    if (!Array.isArray(config.authorized_callback_domains)) {
      config.authorized_callback_domains = [config.authorized_callback_domains];
    }
    config.querystring_callback_params = opts.querystring_callback_params || ['callback'];
    if (!Array.isArray(config.querystring_callback_params)) {
      config.querystring_callback_params = [config.querystring_callback_params];
    }
    config.on_login = opts.on_login;
    config.ticket_store = opts.ticket_store;
    config.token_store = opts.token_store;
    if (opts.defer_login_url != null) {
      config.defer_login_url = opts.defer_login_url;
    } else if (opts.login_html_file != null) {
      try {
        config.login_html = walkabout(opts.login_html_file).read_file_sync('utf8');
      } catch (err) {
        throw new Error('Error reading login_html_file (' + opts.login_html_file + '): ' + err.message);
      }
    } else {
      throw new Error('Must pass either defer_login_url or login_html_file');
    }
    return config;
  };

}).call(this);
