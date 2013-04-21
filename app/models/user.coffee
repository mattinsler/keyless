bcrypt = require 'bcrypt'

class User extends Model
  store_in 'users'

  password:
    set: (p) -> bcrypt.hashSync(p, 17)
  
  authenticate: (password) ->
    bcrypt.compareSync(password, @password)
