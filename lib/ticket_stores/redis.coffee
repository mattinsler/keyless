crypto = require 'crypto'
redis_builder = require 'redis-builder'

class RedisTicketStore
  constructor: (opts = {}) ->
    @client = redis_builder(opts)
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
