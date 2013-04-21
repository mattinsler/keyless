class ApplicationController extends Controller
  before_action (next) ->
    @current_user = @request.user
    next()

  error_json: (err) ->
    @respond_json(500, {error: err.message})

  unauthorized_json: ->
    @respond_json(401, 'Unauthorized')

  respond_json: (code, obj) ->
    @set_headers('Content-Type': 'application/json')
    @respond(code: code, content: JSON.stringify(obj))
  
  authenticated: -> @respond(content: 'Authenticate!')
