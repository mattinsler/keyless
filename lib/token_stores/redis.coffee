crypto = require 'crypto'

build_redis_client = (config = {}) ->
  return config.client if config.client?
  
  url_config = require('url').parse(config.url) if config.url?
  [url_username, url_password] = url_config.auth.split(':') if url_config?.auth?
  
  host = url_config?.hostname || config.host || 'localhost'
  port = url_config?.port || config.port || 6379
  database = url_config?.pathname.slice(1) || config.database
  username = url_username || config.username
  password = url_password || config.password
  
  client = require('redis').createClient(port, host)
  client.auth(password) if password?
  
  if database?
    throw new Error('Database must be an integer') unless parseInt(database).toString() is database.toString()
    client.select(parseInt(database))
  
  client

class RedisTokenStore
  constructor: (opts = {}) ->
    @client = build_redis_client(opts)
    @prefix = opts.prefix ? 'keyless-t:'
    @expiration = opts.expiration ? (60 * 60 * 24)
  
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
    
    @client.multi()
      .setex(@prefix + key, @expiration, JSON.stringify(token_data))
      .sadd(@prefix + ':u:' + user_id, key)
      .expire(@prefix + ':u:' + user_id, @expiration)
      .exec (err) ->
        return callback(err) if err?
        callback(null, key)
  
  get: (token, callback) ->
    @client.multi()
      .get(@prefix + token, (err, token_data) =>
        return callback(err) if err?
        try
          token_data = JSON.parse(token_data)
          @client.expire(@prefix + ':u:' + token_data.user_id, @expiration)
          callback(null, token_data)
        catch e
          callback(e)
      )
      .expire(@prefix + token, @expiration)
      .exec()
  
  remove_token: (token, callback) ->
    @client.multi()
      .get(@prefix + token, (err, token_data) =>
        try
          token_data = JSON.parse(token_data)
          @client.srem(@prefix + ':u:' + token_data.user_id, token)
        catch e
      )
      .del(@prefix + token)
      .exec(callback)
  
  remove_tokens_for_user: (user_id, callback) ->
    @client.multi()
      .smembers(@prefix + ':u:' + user_id, (err, tokens) =>
        return callback(err) if err?
        return callback() unless tokens?.length > 0
        @client.del(tokens.map((t) => @prefix + t), callback)
      )
      .del()
      .exec()

module.exports = (opts) -> new RedisTokenStore(opts)
