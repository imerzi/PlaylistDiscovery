const express = require('express');
const mongoose = require('mongoose');
const keys = require('./config/keys');
const passportSetup = require('./config/passport-setup');
const passport = require('passport')
const cors = require('cors');
const cookieSession = require('cookie-session');
const app = express();
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');

const profileRoutes = require('./routes/profile-routes');
const authRoutes = require('./routes/auth-routes');
const playlistRoutes = require('./routes/playlist-route');
const leaderboardRoutes = require('./routes/leaderboard-routes');
const chatRoutes = require('./routes/chat-routes');

const http = require('http').Server(app);
const server = require('socket.io')(http);

const DATABASE_HOST_NAME = 'localhost';
const DATABASE_NAME = 'playlistDiscovery';

app.use(cors());
app.use(cookieParser());

//set up view engine
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/css'));
app.use(express.static(__dirname + '/images'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// set session cookie to 24 hours and encrypt cookie
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000, // day in millisecondes
    keys: [keys.session.cookieKey]
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.Promise = global.Promise

//connect to mongodb
mongoose.connect('mongodb://' + DATABASE_HOST_NAME + '/' + DATABASE_NAME, () => {
    console.log('Connected to mongodb');
});

// set up routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/playlist', playlistRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/chat', chatRoutes);

//create home route
app.get('/', (req, res) => {
    if (!req.user) {
        res.render('home');
    } else {
        res.render('profile', {page_name: 'profile', user: req.user});
    }
});

var numUsers = 0;

server.on('connection', (socket) => {
    var addedUser = false;
  
    // when the client emits 'new message', this listens and executes
    socket.on('new message', (data) => {
      // we tell the client to execute 'new message'
      socket.broadcast.emit('new message', {
        username: socket.username,
        message: data
      });
    });
  
    // when the client emits 'add user', this listens and executes
    socket.on('add user', (username) => {
      if (addedUser) return;
  
      // we store the username in the socket session for this client
      socket.username = username;
      ++numUsers;
      addedUser = true;
      socket.emit('login', {
        numUsers: numUsers
      });
      // echo globally (all clients) that a person has connected
      socket.broadcast.emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
    });
  
    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', () => {
      socket.broadcast.emit('typing', {
        username: socket.username
      });
    });
  
    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', () => {
      socket.broadcast.emit('stop typing', {
        username: socket.username
      });
    });
  
    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
      if (addedUser) {
        --numUsers;
  
        // echo globally that this client has left
        socket.broadcast.emit('user left', {
          username: socket.username,
          numUsers: numUsers
        });
      }
    });
  });

// start server
http.listen(3000, () => {
    console.log('App now listening or requests on port 3000');
});
