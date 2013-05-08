crypto = require 'crypto'

class MemoryTokenStore
  constructor: ->
    @tokens = {}
    @tokens_by_data = {}
    
  create: (user_id, opts, callback) ->
    if typeof opts is 'function'
      callback = opts
      opts = {}
    
    token_data =
      user_id: user_id
      opts: opts
    
    token_data_str = JSON.stringify(token_data)
    return callback(null, @tokens_by_data[token_data_str]) if @tokens_by_data[token_data_str]?
    
    hash = crypto.createHash('sha256')
    hash.update(crypto.randomBytes(16).toString('hex'))
    hash.update(token_data_str)
    key = hash.digest('hex')
    
    @tokens[key] = token_data
    @tokens_by_data[token_data_str] = key
    callback(null, key)
  
  get: (token, callback) ->
    token_data = @tokens[token]
    callback(null, token_data)
  
  remove_token: (token, callback) ->
    token_data_str = JSON.stringify(@tokens[token])
    delete @tokens[token]
    delete @tokens_by_data[token_data_str]
    callback()
  
  remove_tokens_for_user: (user_id, callback) ->
    Object.keys(@tokens).filter (k) =>
      @tokens[k].user_id.toString() is user_id.toString()
    .forEach (k) =>
      @remove_token(k, ->)
    callback()

module.exports = (opts) -> new MemoryTokenStore(opts)
