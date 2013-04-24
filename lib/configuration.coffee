path = require 'path'
walkabout = require 'walkabout'

module.exports = (opts) ->
  config = {}
  
  config.url = {
    root: opts.root_url ? '/'
  }
  config.url.root = '/' + config.url.root unless config.url.root[0] is '/'
  config.url.login = path.join(config.url.root, 'login')
  config.url.logout = path.join(config.url.root, 'logout')
  config.url.validate = path.join(config.url.root, 'validate')
  
  config.shared_key = opts.shared_key ? '59b325af9e266d0285bc1f0840a5e89915a3105c36f19bae58f5176b15476d05'
  config.shared_key_header = opts.shared_key_header ? 'x-keyless-sso'
  
  config.session_key = opts.session_key ? 'keyless.sid'
  config.session_secret = opts.session_secret ? 'b3dbc47c1cd6b210ab3312aa3804f47d07f15dd5ba50907b0bf5b49da8a02483'
  
  config.force_ssl = opts.force_ssl ? (if process.env.NODE_ENV is 'production' then true else false)
  
  config.authorized_callback_domains = opts.authorized_callback_domains ? [/.*/]
  config.authorized_callback_domains = [config.authorized_callback_domains] unless Array.isArray(config.authorized_callback_domains)
  
  config.on_login = opts.on_login
  
  config.ticket_store = opts.ticket_store
  config.token_store = opts.token_store
  
  if opts.defer_login_url?
    config.defer_login_url = opts.defer_login_url
  else if opts.login_html_file?
    try
      config.login_html = walkabout(opts.login_html_file).read_file_sync('utf8')
    catch err
      throw new Error('Error reading login_html_file (' + opts.login_html_file + '): ' + err.message)
  else
    throw new Error('Must pass either defer_login_url or login_html_file')
  
  config
