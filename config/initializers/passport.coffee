Caboose.app.passport = passport = require 'passport'
LocalStrategy = require('passport-local').Strategy

passport.use(
  new LocalStrategy (username, password, done) ->
    Caboose.get('User').where(username: username).first (err, user) ->
      return done(err) if err?
      return done(null, false) unless user?
      return done(null, false) unless user.authenticate(password)
      done(null, user)
)

passport.serializeUser (user, done) ->
  done(null, user._id)

passport.deserializeUser (id, done) ->
  Caboose.get('User').where(_id: id).first(done)
