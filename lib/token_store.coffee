crypto = require 'crypto'

class TokenStore
  constructor: (opts) ->
    @ttl = opts.ttl or (60 * 60 * 24)
  
  create: (user_id, opts, callback) ->
    if typeof opts is 'function'
      callback = opts
      opts = {}
    
    opts.ttl ?= @ttl
    
    token_data =
      user_id: user_id
      opts: opts
    
    @get_token_by_data token_data, (err, token) =>
      return callback(err) if err?
      return callback(null, token) if token?
      
      hash = crypto.createHash('sha256')
      hash.update(crypto.randomBytes(16).toString('hex'))
      hash.update(JSON.stringify(token_data))
      token = hash.digest('hex')
      
      @save token, token_data, (err) ->
        return callback(err) if err?
        callback(null, token)
  
  # optional callback
  update_token_opts: (token, opts, callback) ->
    @get token, {extend_ttl: false}, (err, token_data) =>
      return callback?(err) if err?
      return callback?() unless token_data?
      
      opts.ttl ?= @ttl
      token_data.opts = opts
      
      @save token, token_data, (err) ->
        return callback?(err) if err?
        callback?()
  
  # optional callback
  save: (token, token_data, callback) ->
    throw new Error('token store must implement save')
  
  # opts (optional):
  # - extend_ttl: true|false
  get: (token, opts, callback) ->
    throw new Error('token store must implement get')
  
  get_token_by_data: (token_data, callback) ->
    throw new Error('token store must implement get_token_by_data')
  
  get_tokens_by_user: (user_id, callback) ->
    throw new Error('token store must implement get_tokens_by_user')
  
  # optional callback
  remove: (token, callback) ->
    throw new Error('token store must implement remove')
  
  # optional callback
  remove_by_data: (token_data, callback) ->
    throw new Error('token store must implement remove_by_data')
  
  # optional callback
  remove_by_user: (user_id, callback) ->
    throw new Error('token store must implement remove_by_user')

module.exports = TokenStore
