express = require 'express'
betturl = require 'betturl'

exports.fix_request = (keyless) ->
  (req, res, next) ->
    req.query = betturl.parse(req.url).query
    req.resolved_protocol = req.get('x-forwarded-proto') ? req.protocol
    req.full_url = req.resolved_protocol + '://' + req.get('host') + req.url
    next()

exports.cookie_parser = (keyless) ->
  express.cookieParser()

exports.session_parser = (keyless) ->
  express.session(
    key: keyless.config.session_key
    secret: keyless.config.session_secret
    store: keyless.config.session_store
    cookie:
      signed: true
      httpOnly: true
      maxAge: 1000 * 60 * 60 * 24
      secure: keyless.config.force_ssl
  )

exports.passport_initialize = (keyless) ->
  keyless.passport.initialize()

exports.passport_session = (keyless) ->
  keyless.passport.session()

exports.router = (keyless) ->
  routes = {}
  routes['get '  + keyless.config.url.login]    = keyless.routes.get_login
  routes['post ' + keyless.config.url.login]    = keyless.routes.post_login
  routes['get '  + keyless.config.url.logout]   = keyless.routes.logout
  routes['get '  + keyless.config.url.validate] = keyless.routes.validate
  
  (req, res, next) ->
    route = routes[req.method.toLowerCase() + ' ' + req.url.split('?')[0]]
    return next() unless route?
    route(keyless, req, res, next)
