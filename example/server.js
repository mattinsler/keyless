var express = require('express')
  , LocalStrategy = require('passport-local').Strategy
  , Keyless = require('keyless');

var keyless = Keyless({
  shared_key: 'fafafeefee',
  login_html_file: './login.html'
});

var users = [{
  id: 1,
  username: 'matt',
  password: 'password'
}];

keyless.passport.use(new LocalStrategy(function(username, password, done) {
  for (var x = 0; x < users.length; ++x) {
    if (users[x].username === username && users[x].password === password) {
      return done(null, users[x]);
    }
  }
  done(null, false);
}));

keyless.passport.serializeUser(function(user, done) {
  done(null, user.id);
});

keyless.passport.deserializeUser(function(id, done) {
  for (var x = 0; x < users.length; ++x) {
    if (users[x].id === parseInt(id)) {
      return done(null, users[x]);
    }
  }
  done();
});

var app = express();

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({secret: 'irhe082h304ufhqu9eyft9eg'}));
app.use(keyless.middleware());
app.use(app.router);

app.listen(3000);
