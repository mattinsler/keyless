walkabout = require 'walkabout'

for file in walkabout(__dirname).readdir_sync() when file.extension is 'js' and file.basename isnt 'index'
  exports[file.basename] = file.require()
