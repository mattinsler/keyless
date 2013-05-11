TokenStore = require '../token_store'

class MemoryTokenStore extends TokenStore
  constructor: (opts = {}) ->
    super
    @tokens = {}
    @tokens_by_data = {}

  # optional callback
  save: (token, token_data, callback) ->
    token_data_str = JSON.stringify(token_data)
    
    @tokens[key] = token_data
    @tokens_by_data[token_data_str] = token
    callback?()
  
  get: (token, callback) ->
    callback(null, @tokens[token])

  get_token_by_data: (token_data, callback) ->
    callback(null, @tokens_by_data[JSON.stringify(token_data)])

  get_tokens_by_user: (user_id, callback) ->
    Object.keys(@tokens).filter (t) =>
      return @tokens[t].user_id.toString() is user_id.toString()

  # optional callback
  remove: (token, callback) ->
    token_data = @tokens[token]
    return callback?() unless token_data?
    token_data_str = JSON.stringify(token_data)
    delete @tokens[token]
    delete @tokens_by_data[token_data_str]
    callback?()

  # optional callback
  remove_by_data: (token_data, callback) ->
    token_data_str = JSON.stringify(token_data)
    token = @tokens_by_data[token_data_str]
    delete @tokens[token]
    delete @tokens_by_data[token_data_str]
    callback?()
  
  # optional callback
  remove_by_user: (user_id, callback) ->
    Object.keys(@tokens).filter (t) =>
      @tokens[t].user_id.toString() is user_id.toString()
    .forEach (t) =>
      @remove(t)
    callback()

module.exports = (opts) -> new MemoryTokenStore(opts)
