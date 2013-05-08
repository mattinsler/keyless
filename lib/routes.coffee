betturl = require 'betturl'

utils = require './utils'

exports.get_login = (keyless, req, res, next) ->
  return if utils.upgrade_to_ssl(keyless, req, res, next)
  
  req.keyless.session.callback = req.query.callback if req.query.callback?
  return utils.create_and_send_ticket(keyless, req, res, next) if req.isAuthenticated()

  if keyless.config.defer_login_url?
    prefix = req.resolved_protocol + '://' + req.get('host')
    parsed = betturl.parse(prefix + req.url)
    parsed.path = keyless.config.defer_login_url
    req.url = betturl.format(parsed).slice(prefix.length)

    req.keyless.error = req.keyless.session.error
    delete req.keyless.session.error
    return next()

  utils.send_html(res, 200, keyless.config.login_html)

exports.post_login = (keyless, req, res, next) ->
  keyless.passport.authenticate('local', (err, user) ->
    return next(err) if err?
    unless user
      req.keyless.session.error = 'User could not be authenticated'
      return utils.send_json(res, 401, {error: req.keyless.session.error}) if req.format is 'json'
      return utils.redirect(res, keyless.config.url.login)
    utils.login_user(keyless, req, res, next, user)
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
  return unless utils.authorize_shared_key(keyless, req, res, next)
  return next(new Error('Must provide a ticket to validate')) unless req.query.ticket?

  keyless.config.ticket_store.get req.query.ticket, (err, user_id) ->
    return next(err) if err?
    return utils.send_json(res, 401, 'Unauthorized') unless user_id?

    keyless.config.token_store.create user_id, inflate_query_object(req.query), (err, token) ->
      return next(err) if err?
      utils.send_json(res, 200, {token: token})

exports.validate_token = (keyless, req, res, next) ->
  return unless utils.authorize_shared_key(keyless, req, res, next)
  return next(new Error('Must provide a token to validate')) unless req.query.token?

  keyless.config.token_store.get req.query.token, (err, token_data) ->
    return next(err) if err?
    return utils.send_json(res, 401, 'Unauthorized') unless token_data?

    keyless.passport.deserializeUser token_data.user_id, (err, user) ->
      return next(err) if err?
      
      keyless.authorize_user user, inflate_query_object(req.query).authorization_data, (err, response) ->
      # keyless.authorize_user user, token_data, (err, response) ->
        return next(err) if err?
        return utils.send_json(res, 200, {user: user}) if response is true
        utils.send_json(res, 403, if typeof response is 'string' then response else 'Token authorization failed')

exports.logout = (keyless, req, res, next) ->
  done = ->
    return utils.redirect(res, decodeURIComponent(req.query.callback)) if req.query.callback?
    utils.redirect(res, keyless.config.url.login)

  return done() unless req.isAuthenticated()
  keyless.passport.serializeUser req.user, (err, user_id) ->
    req.logOut()
    return next(err) if err?
    return next() unless user_id?
    keyless.config.token_store.remove_tokens_for_user(user_id, done)
