betturl = require 'betturl'

utils = require './utils'

get_callback_from_querystring = (keyless, req) ->
  for k in keyless.config.querystring_callback_params
    return decodeURIComponent(req.keyless.server.query[k]) if req.keyless.server.query[k]?

exports.get_login = (keyless, req, res, next) ->
  return if utils.upgrade_to_ssl(req.keyless.server.context)
  
  new_callback = get_callback_from_querystring(keyless, req)
  req.keyless.server.session.callback = new_callback if new_callback?
  return utils.create_and_send_ticket(req.keyless.server.context) if req.keyless.server.user?

  if keyless.config.defer_login_url?
    prefix = req.keyless.server.resolved_protocol + '://' + req.get('host')
    parsed = betturl.parse(prefix + req.url)
    parsed.path = keyless.config.defer_login_url
    req.url = betturl.format(parsed).slice(prefix.length)

    req.keyless.server.error = req.keyless.server.session.error
    delete req.keyless.server.session.error
    return next()

  utils.send_html(req.keyless.server.context, 200, keyless.config.login_html)

exports.post_login = (keyless, req, res, next) ->
  keyless.passport.authenticate('local', (err, user) ->
    return next(err) if err?
    unless user
      return utils.send_json(req.keyless.server.context, 401, {error: 'User could not be authenticated'}) if req.keyless.server.format is 'json'
      req.keyless.server.session.error = 'User could not be authenticated'
      return utils.redirect(req.keyless.server.context, keyless.config.url.login)
    utils.login_user req.keyless.server.context, user, (err) ->
      return next(err) if err?
      utils.create_and_send_ticket(req.keyless.server.context)
  )(req, res, next)

exports.validate = (keyless, req, res, next) ->
  return exports.validate_ticket(keyless, req, res, next) if req.keyless.server.query.ticket?
  return exports.validate_token(keyless, req, res, next) if req.keyless.server.query.token?
  next()

inflate_query_object = (query) ->
  for k, v of query
    query[k] = JSON.parse(v) if typeof v is 'string' and /^\{.*\}$/.test(v)
  query

exports.validate_ticket = (keyless, req, res, next) ->
  return unless utils.authorize_shared_key(req.keyless.server.context)
  return next(new Error('Must provide a ticket to validate')) unless req.keyless.server.query.ticket?
  
  # console.log keyless.config.ticket_store
  keyless.config.ticket_store.get req.keyless.server.query.ticket, (err, user_id) ->
    return next(err) if err?
    return utils.send_json(req.keyless.server.context, 401, 'Unauthorized') unless user_id?

    keyless.config.token_store.create user_id, {type: 'web'}, (err, token) ->
      return next(err) if err?
      utils.send_json(req.keyless.server.context, 200, {token: token})

exports.validate_token = (keyless, req, res, next) ->
  return unless utils.authorize_shared_key(req.keyless.server.context)
  return next(new Error('Must provide a token to validate')) unless req.keyless.server.query.token?

  keyless.config.token_store.get req.keyless.server.query.token, (err, token_data) ->
    return next(err) if err?
    return utils.send_json(req.keyless.server.context, 401, 'Unauthorized') unless token_data?

    keyless.passport.deserializeUser token_data.user_id, (err, user) ->
      return next(err) if err?
      
      keyless.authorize_user user, inflate_query_object(req.keyless.server.query).authorization_data, (err, response) ->
      # keyless.authorize_user user, token_data, (err, response) ->
        return next(err) if err?
        return utils.send_json(req.keyless.server.context, 200, {user: user}) if response is true
        utils.send_json(req.keyless.server.context, 403, if typeof response is 'string' then response else 'Token authorization failed')

exports.logout = (keyless, req, res, next) ->
  done = ->
    callback = get_callback_from_querystring(keyless, req)
    return utils.redirect(req.keyless.server.context, callback) if callback?
    utils.redirect(req.keyless.server.context, keyless.config.url.login)

  return done() unless req.keyless.server.user?
  keyless.passport.serializeUser req.keyless.server.user, (err, user_id) ->
    utils.logout_user(req.keyless.server.context)
    return next(err) if err?
    return next() unless user_id?
    keyless.config.token_store.remove_by_user_type(user_id, 'web', done)
