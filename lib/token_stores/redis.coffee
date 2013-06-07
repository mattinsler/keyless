async = require 'async'
TokenStore = require '../token_store'
redis_builder = require 'redis-builder'

class RedisTokenStore extends TokenStore
  constructor: (opts = {}) ->
    super
    @client = redis_builder(opts.redis)
    @prefix = opts.redis?.prefix or 'keyless-t:'
  
  _get_token_data_str: (token, callback) ->
    @client.get(@prefix + token, callback)
  
  _extend_ttl: (token, token_data, token_data_str, callback) ->
    ttl = token_data.opts.ttl or @ttl
    
    multi = @client.multi()
    if ttl is -1
      multi = multi
        .persist(@prefix + token)
        .persist(@prefix + 'd:' + token_data_str)
    else
      multi = multi
        .expire(@prefix + token, ttl)
        .expire(@prefix + 'd:' + token_data_str, ttl)
    
    multi.exec (err) ->
      callback?(err)
  
  # optional callback
  save: (token, token_data, callback) ->
    ttl = token_data.opts.ttl
    token_data_str = JSON.stringify(token_data)
    
    multi = @client.multi()
      .sadd(@prefix + 'u:' + token_data.user_id, token)
      # Don't really need to persist here, but this will recover from prior mistakes
      .persist(@prefix + 'u:' + token_data.user_id)
    
    if ttl is -1
      multi = multi
        .set(@prefix + token, token_data_str)
        .set(@prefix + 'd:' + token_data_str, token)
    else
      multi = multi
        .setex(@prefix + token, ttl, token_data_str)
        .setex(@prefix + 'd:' + token_data_str, ttl, token)
    
    multi.exec (err) ->
      callback?(err)
  
  get: (token, opts, callback) ->
    if typeof opts is 'function'
      callback = opts
      opts = {}
    
    @_get_token_data_str token, (err, token_data_str) =>
      return callback(err) if err?
      return callback() unless token_data_str?
      
      try
        token_data = JSON.parse(token_data_str)
        @_extend_ttl(token, token_data, token_data_str) unless opts.extend_ttl is false
        callback(null, token_data)
      catch err
        @remove(token, token_data_str)
        callback(err)
  
  get_token_by_data: (token_data, callback) ->
    @client.get(@prefix + 'd:' + JSON.stringify(token_data), callback)

  get_tokens_by_user: (user_id, callback) ->
    @client.smembers(@prefix + 'u:' + user_id, callback)
  
  # optional callback
  remove: (token, token_data_str, callback) ->
    if typeof token_data_str is 'function'
      callback = token_data_str
      token_data_str = null
    
    do_remove = (token, token_data_str) =>
      try
        token_data = JSON.parse(token_data_str) if token_data_str?
      catch e
      
      if token_data?.user_id?
        @client.multi()
          .del([
            @prefix + token,
            @prefix + 'd:' + token_data_str
          ])
          .srem(@prefix + 'u:' + token_data.user_id, token)
          .exec (err) ->
            callback?(err)
      else
        @client.del [
          @prefix + token,
          @prefix + 'd:' + token_data_str
        ], (err) ->
          callback?(err)
    
    return do_remove(token, token_data_str) if token_data_str?
    
    @_get_token_data_str token, (err, token_data_str) ->
      return callback(err) if err?
      do_remove(token, token_data_str)
  
  # optional callback
  remove_by_data: (token_data, callback) ->
    token_data_str = JSON.stringify(token_data)
    @get_token_by_data token_data, (err, token) =>
      return callback(err) if err?
      return callback() unless token?
      @remove(token, token_data_str, callback)
  
  # optional callback
  remove_by_user: (user_id, callback) ->
    @client.smembers @prefix + 'u:' + user_id, (err, tokens) =>
      return callback(err) if err?
      return callback() unless tokens?
      async.each tokens, (token, cb) =>
        @remove(token, cb)
      , (err) =>
        callback?(err)
        # delete the list just in case
        @client.del(@prefix + 'u:' + user_id, ->)

module.exports = (opts) -> new RedisTokenStore(opts)
