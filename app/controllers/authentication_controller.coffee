betturl = require 'betturl'
ApplicationController = Caboose.get('ApplicationController')

create_callback_url = (url, ticket) ->
  parsed = betturl.parse(url)
  parsed.query.ticket = ticket
  require('url').format(
    protocol: parsed.protocol + ':'
    hostname: parsed.host
    port: parsed.port
    pathname: parsed.path
    query: parsed.query
    hash: '#' + parsed.hash
  )

class AuthenticationController extends ApplicationController
  login: ->
    if @current_user?
      if @query.callback?
        console.log create_callback_url(@query.callback, 'ticket-id')
      # return @redirect_to()
    @render()
  
  post_login: ->
    console.log @query
    console.log JSON.parse(@body.querystring)
    @redirect_to '/login'
  
  logout: ->
    
