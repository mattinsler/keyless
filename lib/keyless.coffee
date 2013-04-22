Path = require 'path'
async = require 'async'
express = require 'express'
betturl = require 'betturl'
walkabout = require 'walkabout'

ticket_stores = {}
walkabout(__dirname).join('ticket_stores').readdir_sync().forEach (file) ->
  return unless file.extension is 'js'
  ticket_stores[file.basename] = file.require()

class Keyless
  constructor: (@opts = {}) ->
    @opts.root_url ?= '/'
    @opts.root_url = '/' + @opts.root_url unless @opts.root_url[0] is '/'
    @opts.shared_key_header ?= 'x-keyless-sso'
    @opts.shared_key ?= '59b325af9e266d0285bc1f0840a5e89915a3105c36f19bae58f5176b15476d05'
    @opts.login_html_file ?= ''
    @opts.session_key ?= 'keyless.sid'
    @opts.session_secret ?= 'b3dbc47c1cd6b210ab3312aa3804f47d07f15dd5ba50907b0bf5b49da8a02483'
    @opts.ticket_store ?= ticket_stores.memory()
    
    @login_url = Path.join(@opts.root_url, 'login')
    @logout_url = Path.join(@opts.root_url, 'logout')
    @validate_url = Path.join(@opts.root_url, 'validate')
    
    try
      @login_html = walkabout(@opts.login_html_file).read_file_sync('utf8')
    catch e
      console.error 'Keyless: Must pass a valid login_html_file'
      process.exit(1)
    
    @passport = @opts.passport
    unless @passport?
      @passport = require 'passport'
    
    @passport_initialize = @passport.initialize()
    @passport_session = @passport.session()
    @cookie_parser = express.cookieParser()
    @session_parser = express.session(key: @opts.session_key, secret: @opts.session_secret, store: @opts.session_store, cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true, signed: true})
  
  send: (res, statusCode, data) ->
    res.writeHead(statusCode,
      'Content-Length': Buffer.byteLength(data)
    )
    res.end(data)
  
  send_html: (res, statusCode, data) ->
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    @send(res, statusCode, data)
  
  send_json: (res, statusCode, data) ->
    res.setHeader('Content-Type', 'application/json')
    @send(res, statusCode, JSON.stringify(data))
  
  redirect: (res, to) ->
    res.setHeader('Location', to)
    @send(res, 302, '')
  
  routing_middleware: (req, res, next) ->
    url = req.url.split('?')[0]
    
    return @handle_login_get(req, res, next) if url is @login_url and req.method is 'GET'
    return @handle_login_post(req, res, next) if url is @login_url and req.method is 'POST'
    return @handle_logout(req, res, next) if url is @logout_url and req.method is 'GET'
    return @handle_validate(req, res, next) if url is @validate_url and req.method is 'GET'
    
    next()
  
  parse_querystring: (req, res, next) ->
    req.query = betturl.parse(req.url).query
    next()
  
  middleware: ->
    (req, res, next) =>
      req.keyless = {}
      async.series [
        (cb) => @parse_querystring(req, res, cb)
        (cb) => @cookie_parser(req, res, cb)
        (cb) => @session_parser(req, res, cb)
        (cb) => @passport_initialize(req, res, cb)
        (cb) => @passport_session(req, res, cb)
        (cb) => @routing_middleware(req, res, cb)
      ], next
  
  create_callback_url: (url, ticket) ->
    parsed = betturl.parse(url)
    parsed.query.ticket = ticket
    betturl.format(parsed)
  
  create_and_send_ticket: (req, res, next) ->
    callback = req.session.callback
    delete req.session.callback
    
    @opts.ticket_store.create req._passport.session.user, (err, ticket) =>
      return next(err) if err?
      
      callback = @create_callback_url(callback, ticket)
      @redirect(res, callback)
  
  login_user: (req, res, next, user) ->
    # return @redirect_to('/authenticated') unless @session.callback?
    req.logIn user, (err) =>
      return next(err) if err?
      @create_and_send_ticket(req, res, next)
  
  handle_login_get: (req, res, next) ->
    req.session.callback = req.query.callback if req.query.callback? and not req.session.callback?
    return @create_and_send_ticket(req, res, next) if req.isAuthenticated()
    @send_html(res, 200, @login_html)
  
  handle_login_post: (req, res, next) ->
    @passport.authenticate('local', (err, user) =>
      return next(res, err) if err?
      return @redirect(res, @login_url) unless user
      @login_user(req, res, next, user)
    )(req, res, next)
  
  handle_logout: (req, res, next) ->
    req.logOut()
    return @redirect(res, decodeURIComponent(req.query.callback)) if req.query.callback?
    @redirect(res, @login_url)
  
  handle_validate: (req, res, next) ->
    shared_key = req.headers[@opts.shared_key_header]
    return @send_json(res, 401, 'Unauthorized') unless shared_key is @opts.shared_key
    
    return next(new Error('Must provide a ticket to validate')) unless req.query.ticket?
    
    @opts.ticket_store.get req.query.ticket, (err, user_id) =>
      return next(err) if err?
      return @send_json(res, 401, 'Unauthorized') unless user_id?
      
      req._passport.instance.deserializeUser user_id, (err, user) =>
        return next(err) if err?
        @send_json(res, 200, {user: user})

module.exports = (opts) -> new Keyless(opts)
module.exports.TicketStore = ticket_stores
