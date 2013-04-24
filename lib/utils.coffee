betturl = require 'betturl'

# Response Helpers

exports.send = (res, statusCode, data) ->
  res.writeHead(statusCode,
    'Content-Length': Buffer.byteLength(data)
  )
  res.end(data)

exports.send_html = (res, statusCode, data) ->
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  exports.send(res, statusCode, data)

exports.send_json = (res, statusCode, data) ->
  res.setHeader('Content-Type', 'application/json')
  exports.send(res, statusCode, JSON.stringify(data))

exports.redirect = (res, to) ->
  res.setHeader('Location', to)
  exports.send(res, 302, '')


# Route Utilities

exports.create_callback_url = (keyless, req, url, ticket) ->
  parsed = betturl.parse(url)
  parsed.protocol ?= req.resolved_protocol
  [parsed.host, parsed.port] = req.get('host').split(':') unless parsed.host?
  delete parsed.port unless parsed.port?
  parsed.query.ticket = ticket

  matches = keyless.config.authorized_callback_domains.filter (matcher) ->
    return matcher is parsed.host if typeof matcher is 'string'
    return matcher.test(parsed.host) if matcher.test? and typeof matcher.test is 'function'
    false
  
  throw new Error('Unauthorized callback domain') if matches.length is 0
  betturl.format(parsed)

exports.upgrade_to_ssl = (keyless, req, res, next) ->
  return false unless keyless.config.force_ssl is true
  return false if req.resolved_protocol is 'https'
  exports.redirect(res, 'https://' + req.get('host') + req.url)
  true

exports.login_user = (keyless, req, res, next, user) ->
  req.logIn user, (err) ->
    return next(err) if err?
    exports.create_and_send_ticket(keyless, req, res, next)

exports.create_and_send_ticket = (keyless, req, res, next) ->
  callback = req.session.callback
  delete req.session.callback
  callback ?= keyless.config.on_login if keyless.config.on_login?

  keyless.config.ticket_store.create req._passport.session.user, (err, ticket) ->
    return next(err) if err?

    try
      callback = exports.create_callback_url(keyless, req, callback, ticket)
    catch err
      req.logOut()
      return exports.send_json(res, 403, err.message)
    exports.redirect(res, callback)

exports.authorize_shared_key = (keyless, req, res, next) ->
  shared_key = req.headers[keyless.config.shared_key_header]
  return true if shared_key is keyless.config.shared_key
  exports.send_json(res, 401, 'Unauthorized')
  false
# 
# exports.authorize_user = (keyless, user, token, done) ->
#   return @_authorizers.push(user) if typeof user is 'function'
# 
#   stack = @_authorizers
#   pass = (i, err, obj) ->
#     err = undefined if err is 'pass'
#     return done(err, obj) if err or obj or obj is 0
# 
#     layer = stack[i]
#     return done(new Error('failed to authorize')) unless layer
# 
#     try
#       layer(user, token, (e, o) -> pass(i + 1, e, o))
#     catch e
#       done(e)
# 
#   pass(0)