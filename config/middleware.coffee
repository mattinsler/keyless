express = require 'express'
flash = require 'connect-flash'
passport = Caboose.app.passport
RedisStore = require('connect-redis')(express)

module.exports = (http) ->
  http.use express.bodyParser()
  http.use express.methodOverride()
  http.use express.cookieParser('809uu080hu43fh0uh0f8h20h')
  http.use express.session(key: 'keyless.sid', store: new RedisStore(client: Caboose.app.redis, prefix: 'keyless-s:'), secret: '89yh2o3uwhgef97tg93ug9ef7g')
  http.use flash()
  http.use passport.initialize()
  http.use passport.session()
  http.use -> Caboose.app.router.route.apply(Caboose.app.router, arguments)
  http.use express.static Caboose.root.join('public').path
