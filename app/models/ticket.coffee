crypto = require 'crypto'

class Ticket
  @create: (user, callback) ->
    key = crypto.randomBytes(16).toString('hex')
    
    Caboose.app.redis.setex 'keyless-t:' + key, 60, user._id, (err) ->
      return callback(err) if err?
      callback(null, key)
  
  @get: (ticket, callback) ->
    Caboose.app.redis.get('keyless-t:' + ticket, callback)
