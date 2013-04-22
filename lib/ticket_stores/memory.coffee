crypto = require 'crypto'

class MemoryTicketStore
  constructor: ->
    @tickets = {}
    
  create: (user_id, callback) ->
    key = crypto.randomBytes(16).toString('hex')
    
    @tickets[key] = user_id
    callback(null, key)
  
  get: (ticket, callback) ->
    user_id = @tickets[ticket]
    delete @tickets[ticket]
    callback(null, user_id)

module.exports = (opts) -> new MemoryTicketStore(opts)
