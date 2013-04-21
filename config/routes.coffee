module.exports = ->
  @route '/', 'tickets#new'
  
  @route 'login', 'tickets#new'
  @route 'post login', 'tickets#create'
  @route 'logout', 'tickets#destroy'
  @route 'validate', 'tickets#validate'
  
  @route 'authenticated', 'application#authenticated'
