crypto = require 'crypto'

class TokenStore
  constructor: ->
    
  
  create: (user_id, opts, callback) ->
    if typeof opts is 'function'
      callback = opts
      opts = {}
    
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
  
  save: (token, token_data, callback) ->
    throw new Error('token store must implement save')
  
  get: (token, callback) ->
    throw new Error('token store must implement get')
  
  get_token_by_data: (token_data_str, callback) ->
    throw new Error('token store must implement get_token_by_data')
  
  get_tokens_by_user: (user_id, callback) ->
    throw new Error('token store must implement get_tokens_by_user')
  
  remove: (token, callback) ->
    throw new Error('token store must implement remove')
  
  remove_by_data: (token_data, callback) ->
    throw new Error('token store must implement remove_by_data')
  
  remove_by_user: (user_id, callback) ->
    throw new Error('token store must implement remove_by_user')

module.exports = TokenStore
