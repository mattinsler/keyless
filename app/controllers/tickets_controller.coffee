_ = require 'underscore'
betturl = require 'betturl'
passport = Caboose.app.passport
User = Caboose.get('User')
Ticket = Caboose.get('Ticket')
ApplicationController = Caboose.get('ApplicationController')

create_callback_url = (url, ticket) ->
  parsed = betturl.parse(url)
  parsed.query.ticket = ticket
  
  betturl.format(parsed)

class TicketsController extends ApplicationController
  before_action (next) ->
    @session.callback = @query.callback if @query.callback? and not @session.callback?
    next()
  , {only: 'new'}
  
  before_action (next) ->
    shared_key = @request.headers['x-keyless-sso'] or @request.query['keyless-sso']
    return @unauthorized_json() unless shared_key is 'fafafeefee'
    next()
  , {only: 'validate'}
  
  login: (user) ->
    return @redirect_to('/authenticated') unless @session.callback?
    
    callback = @session.callback
    delete @session.callback
    Ticket.create user, (err, ticket) =>
      return @error(err) if err?
      callback = create_callback_url(callback, ticket)
      @redirect_to(callback)
  
  new: ->
    return @login(@current_user) if @current_user?
    @render()
  
  create: ->
    passport.authenticate('local', (err, user) =>
      return @error(err) if err?
      return @redirect_to('/login') unless user
      @request.logIn user, (err) =>
        return @error(err) if err?
        @login(user)
    )(@request, @response, ->)
  
  destroy: ->
    @request.logOut()
    return @redirect_to(decodeURIComponent(@query.callback)) if @query.callback?
    @redirect_to '/login'
  
  validate: ->
    return @error_json(new Error('Must provide a ticket to validate')) unless @query.ticket?
    Ticket.get @query.ticket, (err, user_id) =>
      return @error_json(err) if err?
      return @unauthorized_json() unless user_id?
      
      User.where(_id: user_id).fields(['identity', 'metadata']).first (err, user) =>
        return @error_json(err) if err?
        delete user._id
        @respond_json(200, {user: user})
