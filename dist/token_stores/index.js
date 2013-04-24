(function() {
  var file, walkabout, _i, _len, _ref;

  walkabout = require('walkabout');

  _ref = walkabout(__dirname).readdir_sync();
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    file = _ref[_i];
    if (file.extension === 'js' && file.basename !== 'index') {
      exports[file.basename] = file.require();
    }
  }

}).call(this);
