crc32 = require 'express/node_modules/buffer-crc32'
cookie_util = require 'express/node_modules/cookie'
Cookie = require 'express/node_modules/connect/lib/middleware/session/cookie'
signature = require 'express/node_modules/cookie-signature'
connect_utils = require 'express/node_modules/connect/lib/utils'

module.exports = (keyless) ->
  (req, res, next) ->
    return next() if req.keyless.server.session?
    
    cookies = req.headers.cookie
    if cookies?
      try
        signed_cookies = connect_utils.parseSignedCookies(cookie_util.parse(cookies), keyless.config.session_secret)
        signed_cookies = connect_utils.parseJSONCookies(signed_cookies)
      catch err
        err.status = 400
        return next(err)
    
    req.keyless.server.session = signed_cookies?[keyless.config.session_key] or {}
    # Fix bad sessions just in case
    req.keyless.server.session = {} if typeof req.keyless.server.session isnt 'object'
    session_hash = crc32.signed(JSON.stringify(req.keyless.server.session))
    
    cookie = req.keyless.server.session.cookie = new Cookie(
      signed: true
      httpOnly: true
      path: '/'
      maxAge: 1000 * 60 * 60 * 24
      secure: keyless.config.force_ssl
    )
    
    return next() unless req.originalUrl.indexOf(cookie.path) is 0
    
    res.on 'header', ->
      unless req.keyless.server.session?
        cookie.expires = new Date(0)
        res.setHeader('Set-Cookie', cookie.serialize(keyless.config.session_key, ''))
        return
      
      delete req.keyless.server.session.cookie
      
      session_str = JSON.stringify(req.keyless.server.session)
      return if session_hash is crc32.signed(session_str)
      
      session_str = 'j:' + session_str
      cookie_value = cookie.serialize(keyless.config.session_key, 's:' + signature.sign(session_str, keyless.config.session_secret))
      res.setHeader('Set-Cookie', cookie_value)
    
    next()
