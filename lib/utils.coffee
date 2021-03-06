betturl = require 'betturl'

# Response Helpers

exports.send = (context, statusCode, data) ->
  context.res.writeHead(statusCode,
    'Content-Length': Buffer.byteLength(data)
  )
  context.res.end(data)

exports.send_html = (context, statusCode, data) ->
  context.res.setHeader('Content-Type', 'text/html; charset=utf-8')
  exports.send(context, statusCode, data)

exports.send_json = (context, statusCode, data) ->
  context.res.setHeader('Content-Type', 'application/json')
  exports.send(context, statusCode, JSON.stringify(data))

exports.redirect = (context, to) ->
  context.res.setHeader('Location', to)
  exports.send(context, 302, '')


# Route Utilities

exports.create_callback_url = (context, url, ticket) ->
  parsed = betturl.parse(url)
  parsed.protocol ?= context.req.keyless.server.resolved_protocol
  [parsed.host, parsed.port] = context.req.get('host').split(':') unless parsed.host?
  delete parsed.port unless parsed.port?
  parsed.query.auth_ticket = ticket if ticket?

  matches = context.keyless.config.authorized_callback_domains.filter (matcher) ->
    return matcher is parsed.host if typeof matcher is 'string'
    return matcher.test(parsed.host) if matcher.test? and typeof matcher.test is 'function'
    false
  
  throw new Error('Unauthorized callback domain') if matches.length is 0
  betturl.format(parsed)

exports.upgrade_to_ssl = (context) ->
  return false unless context.keyless.config.force_ssl is true
  return false if context.req.keyless.server.resolved_protocol is 'https'
  exports.redirect(context, 'https://' + context.req.get('host') + context.req.url)
  true

exports.login_user = (context, user, callback) ->
  # console.log 'KEYLESS: login_user'
  
  if context.req.keyless.server.session.token?
    context.req.keyless.server.user = user
    return callback()
  
  context.keyless.passport.serializeUser user, (err, id) ->
    return callback(err) if err?
    
    context.keyless.config.token_store.create id, {type: 'web'}, (err, token) ->
      return callback(err) if err?
      
      context.req.keyless.server.user = user
      context.req.keyless.server.session.token = token
      callback()

exports.logout_user = (context) ->
  context.req.keyless.server.user = null
  delete context.req.keyless.server.session.token

exports.create_and_send_ticket = (context) ->
  # console.log 'KEYLESS: create_and_send_ticket'
  
  callback = context.req.keyless.server.session.callback
  delete context.req.keyless.server.session.callback
  callback ?= context.keyless.config.on_login if context.keyless.config.on_login?
  
  return exports.send_json(context, 200, {redirect: exports.create_callback_url(context, callback)}) if context.req.keyless.server.format is 'json'
  
  context.keyless.passport.serializeUser context.req.keyless.server.user, (err, id) ->
    return context.next(err) if err?
    
    context.keyless.config.ticket_store.create id, (err, ticket) ->
      return context.next(err) if err?
    
      try
        callback = exports.create_callback_url(context, callback, ticket)
      catch err
        exports.logout_user(context)
        return exports.send_json(context, 403, err.message)
      exports.redirect(context, callback)

exports.authorize_shared_key = (context) ->
  shared_key = context.req.headers[context.keyless.config.shared_key_header]
  return true if shared_key is context.keyless.config.shared_key
  exports.send_json(context, 401, 'Unauthorized')
  false
