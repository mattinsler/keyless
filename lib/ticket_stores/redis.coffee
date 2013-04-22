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

class RedisTicketStore
  constructor: (opts = {}) ->
    @client = build_redis_client(opts)
    @prefix = opts.prefix ? 'keyless-t:'
    
  create: (user_id, callback) ->
    key = crypto.randomBytes(16).toString('hex')
    
    @client.setex @prefix + key, 60, user_id, (err) ->
      return callback(err) if err?
      callback(null, key)
  
  get: (ticket, callback) ->
    @client.multi()
      .get(@prefix + ticket, callback)
      .del(@prefix + ticket)
      .exec()

module.exports = (opts) -> new RedisTicketStore(opts)
