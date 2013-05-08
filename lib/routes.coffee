betturl = require 'betturl'

utils = require './utils'

exports.get_login = (keyless, req, res, next) ->
  return if utils.upgrade_to_ssl(req.keyless.context)
  
  req.keyless.session.callback = req.query.callback if req.query.callback?
  return utils.create_and_send_ticket(req.keyless.context) if req.keyless.user?

  if keyless.config.defer_login_url?
    prefix = req.resolved_protocol + '://' + req.get('host')
    parsed = betturl.parse(prefix + req.url)
    parsed.path = keyless.config.defer_login_url
    req.url = betturl.format(parsed).slice(prefix.length)

    req.keyless.error = req.keyless.session.error
    delete req.keyless.session.error
    return next()

  utils.send_html(req.keyless.context, 200, keyless.config.login_html)

exports.post_login = (keyless, req, res, next) ->
  keyless.passport.authenticate('local', (err, user) ->
    return next(err) if err?
    unless user
      req.keyless.session.error = 'User could not be authenticated'
      return utils.send_json(req.keyless.context, 401, {error: req.keyless.session.error}) if req.format is 'json'
      return utils.redirect(req.keyless.context, keyless.config.url.login)
    utils.login_user req.keyless.context, user, (err) ->
      return next(err) if err?
      utils.create_and_send_ticket(req.keyless.context)
  )(req, res, next)

exports.validate = (keyless, req, res, next) ->
  return exports.validate_ticket(keyless, req, res, next) if req.query.ticket?
  return exports.validate_token(keyless, req, res, next) if req.query.token?
  next()

inflate_query_object = (query) ->
  for k, v of query
    query[k] = JSON.parse(v) if typeof v is 'string' and /^\{.*\}$/.test(v)
  query

exports.validate_ticket = (keyless, req, res, next) ->
  return unless utils.authorize_shared_key(req.keyless.context)
  return next(new Error('Must provide a ticket to validate')) unless req.query.ticket?
  
  console.log keyless.config.ticket_store
  keyless.config.ticket_store.get req.query.ticket, (err, user_id) ->
    return next(err) if err?
    return utils.send_json(req.keyless.context, 401, 'Unauthorized') unless user_id?

    keyless.config.token_store.create user_id, inflate_query_object(req.query), (err, token) ->
      return next(err) if err?
      utils.send_json(req.keyless.context, 200, {token: token})

exports.validate_token = (keyless, req, res, next) ->
  return unless utils.authorize_shared_key(req.keyless.context)
  return next(new Error('Must provide a token to validate')) unless req.query.token?

  keyless.config.token_store.get req.query.token, (err, token_data) ->
    return next(err) if err?
    return utils.send_json(req.keyless.context, 401, 'Unauthorized') unless token_data?

    keyless.passport.deserializeUser token_data.user_id, (err, user) ->
      return next(err) if err?
      
      keyless.authorize_user user, inflate_query_object(req.query).authorization_data, (err, response) ->
      # keyless.authorize_user user, token_data, (err, response) ->
        return next(err) if err?
        return utils.send_json(req.keyless.context, 200, {user: user}) if response is true
        utils.send_json(req.keyless.context, 403, if typeof response is 'string' then response else 'Token authorization failed')

exports.logout = (keyless, req, res, next) ->
  done = ->
    return utils.redirect(req.keyless.context, decodeURIComponent(req.query.callback)) if req.query.callback?
    utils.redirect(req.keyless.context, keyless.config.url.login)

  return done() unless req.keyless.user?
  keyless.passport.serializeUser req.keyless.user, (err, user_id) ->
    utils.logout_user(req.keyless.context)
    return next(err) if err?
    return next() unless user_id?
    keyless.config.token_store.remove_tokens_for_user(user_id, done)
