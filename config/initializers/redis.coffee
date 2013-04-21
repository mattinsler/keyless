caboose_redis = require 'caboose-redis'

caboose_redis.connect (err, client) ->
  if err?
    console.error(err.stack)
    process.exit(1)
  Caboose.app.redis = client
