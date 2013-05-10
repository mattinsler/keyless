async = require 'async'
LocalStrategy = require('passport-local').Strategy

module.exports = (opts) -> new Keyless(opts)

utils = module.exports.utils = require './utils'
routes = module.exports.routes = require './routes'
middleware = module.exports.middleware = require './middleware'
configuration = module.exports.configuration = require './configuration'

TicketStore = module.exports.TicketStore = require './ticket_stores'
TokenStore = module.exports.TokenStore = require './token_stores'

class Keyless
  constructor: (opts = {}) ->
    try
      @config = configuration(opts)
      @config.ticket_store ?= TicketStore.memory()
      @config.token_store ?= TokenStore.memory()
    catch err
      throw new Error('Keyless: ' + err.message)
    
    @passport = require 'passport'
    
    @__defineSetter__ 'authenticate_user', (v) ->
      @passport.use(new LocalStrategy(v))
    @__defineSetter__ 'get_id_from_user', (v) ->
      @passport._serializers = []
      @passport.serializeUser(v)
    @__defineSetter__ 'get_user_from_id', (v) ->
      @passport._deserializers = []
      @passport.deserializeUser(v)
    
    @authenticate_user = (username, password, done) -> done(new Error('Implement keyless.authenticate_user'))
    @get_id_from_user = (user, done) -> done(new Error('Implement keyless.get_id_from_user'))
    @get_user_from_id = (id, done) -> done(new Error('Implement keyless.get_user_from_id'))
    @authorize_user = (user, token_data, done) -> done(null, true)
    
    @routes = routes
    
    @middleware_stack = [
      middleware.fix_request(@)
      middleware.keyless_cookie(@)
      middleware.keyless_user(@)
      # middleware.passport_initialize(@)
      # middleware.passport_session(@)
      middleware.router(@)
    ]
  
  middleware: ->
    (req, res, next) =>
      req.keyless ?= {}
      req.keyless.server ?= {}
      req.keyless.server.context =
        keyless: @
        req: req
        res: res
      async.eachSeries @middleware_stack, (layer, cb) ->
        req.keyless.server.context.next = cb
        layer(req, res, cb)
      , next
