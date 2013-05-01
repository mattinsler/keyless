cookie = require 'express/node_modules/cookie'
Cookie = require 'express/node_modules/connect/lib/middleware/session/cookie'
signature = require 'express/node_modules/cookie-signature'
connect_utils = require 'express/node_modules/connect/lib/utils'

module.exports = (keyless) ->
  (req, res, next) ->
    return next() if req.keyless.session?
    
    cookies = req.headers.cookie
    return next() unless cookies?
    try
      signed_cookies = connect_utils.parseSignedCookies(cookie.parse(cookies), keyless.config.session_secret)
      signed_cookies = connect_utils.parseJSONCookies(signed_cookies)
    catch err
      err.status = 400
      return next(err)
    
    req.keyless.session = signed_cookies[keyless.config.session_key] or {}
    # Fix bad cookies just in case
    req.keyless.session = {} if typeof req.keyless.session isnt 'object'
    
    req.keyless.session.cookie = new Cookie(
      signed: true
      httpOnly: true
      maxAge: 1000 * 60 * 60 * 24
      secure: keyless.config.force_ssl
    )
    
    res.on 'header', ->
      unless req.keyless.session?
        req.keyless.session.cookie.expires = new Date(0)
        res.setHeader('Set-Cookie', cookie.serialize(keyless.config.session_key, ''))
        return
      
      delete req.keyless.session.cookie
      # delete req.keyless.session[keyless.passport._key]
      
      json = 'j:' + JSON.stringify(req.keyless.session)
      cookie_value = cookie.serialize(keyless.config.session_key, 's:' + signature.sign(json, keyless.config.session_secret))
      res.setHeader('Set-Cookie', cookie_value)
    
    next()