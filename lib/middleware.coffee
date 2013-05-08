express = require 'express'
betturl = require 'betturl'

exports.fix_request = (keyless) ->
  (req, res, next) ->
    parsed = betturl.parse(req.url)
    req.query = parsed.query
    req.path = parsed.path
    req.format = 'json' if /\.json$/.test(req.path) or req.headers.accept is 'application/json'
    req.format ?= 'html'
    req.resolved_protocol = req.get('x-forwarded-proto') ? req.protocol
    req.full_url = req.resolved_protocol + '://' + req.get('host') + req.url
    next()

exports.keyless_cookie = require './keyless_cookie'

exports.passport_initialize = (keyless) ->
  # keyless.passport.initialize()
  (req, res, next) ->
    passport = keyless.passport
    req._passport =
      instance: passport
    
    if req.keyless.session and req.keyless.session[passport._key]
      req._passport.session = req.keyless.session[passport._key]
    else if req.keyless.session
      req.keyless.session[passport._key] = {}
      req._passport.session = req.keyless.session[passport._key]
    else
      req._passport.session = {}
    
    next()

exports.passport_session = (keyless) ->
  keyless.passport.session()

exports.router = (keyless) ->
  routes = {}
  routes['get '  + keyless.config.url.login]    = keyless.routes.get_login
  routes['post ' + keyless.config.url.login]    = keyless.routes.post_login
  routes['post ' + keyless.config.url.login + '.json']    = keyless.routes.post_login
  routes['get '  + keyless.config.url.logout]   = keyless.routes.logout
  routes['get '  + keyless.config.url.validate] = keyless.routes.validate
  
  (req, res, next) ->
    route = routes[req.method.toLowerCase() + ' ' + req.url.split('?')[0]]
    return next() unless route?
    route(keyless, req, res, next)
