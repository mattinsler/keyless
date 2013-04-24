crypto = require 'crypto'

class MemoryTokenStore
  constructor: ->
    @tokens = {}
    
  create: (user_id, opts, callback) ->
    if typeof opts is 'function'
      callback = opts
      opts = {}
    
    token_data =
      user_id: user_id
      opts: opts
    
    hash = crypto.createHash('sha256')
    hash.update(crypto.randomBytes(16).toString('hex'))
    hash.update(JSON.stringify(token_data))
    key = hash.digest('hex')
    
    @tokens[key] = token_data
    callback(null, key)
  
  get: (token, callback) ->
    token_data = @tokens[token]
    callback(null, token_data)
  
  remove_token: (token, callback) ->
    delete @tokens[token]
    callback()
  
  remove_tokens_for_user: (user_id, callback) ->
    Object.keys(@tokens).filter (k) =>
      @tokens[k].user_id is user_id
    .forEach (k) =>
      delete @tokens[k]
    callback()

module.exports = (opts) -> new MemoryTokenStore(opts)
