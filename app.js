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
const axios = require('axios');

const profileRoutes = require('./routes/profile-routes');
const authRoutes = require('./routes/auth-routes');
const playlistRoutes = require('./routes/playlist-route');
const leaderboardRoutes = require('./routes/leaderboard-routes');
const chatRoutes = require('./routes/chat-routes');
const libraryRoutes = require('./routes/library-routes');

const http = require('http').Server(app);
const server = require('socket.io')(http);

const DATABASE_HOST_NAME = 'localhost';
const DATABASE_NAME = 'playlistDiscovery';

const Playlist = require('./models/user-playlist');
const User = require('./models/user-model');

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
app.use('/library', libraryRoutes);

//create home route
app.get('/', (req, res) => {
    if (!req.user) {
        res.render('home');
    } else {
        res.render('profile', {page_name: 'profile', user: req.user});
    }
});

app.post("/index/:id", function (req, res) {
  Playlist.findOne({playlistId: req.params.id}).then((currentPlaylist) => {
    if (currentPlaylist) {
      currentPlaylist.likes += 1;
      currentPlaylist.save();
      res.send({likeCount: currentPlaylist.likes});
    }
  })
});

app.post('/add', async function(req, res) {
  let access_token = req.user.userAccessToken;
  let artistName = req.body.artistName;
  let artistInfo = [];

  if(req.cookies.artistInfo){
    artistInfo = req.cookies.artistInfo;
  }

  await search(artistName, access_token).then(function(result) {
    let artist = result.data.artists.items[0];
    let obj = {
      img: artist.images[0].url,
      name: artist.name,
      artistId: artist.id
    }
    artistInfo.push(obj);
    res.cookie('artistInfo', artistInfo);
    res.render('playlist_random', {page_name: 'playlist', artistInfo: artistInfo, alert:'false'});
  })
});

async function search(artistName, access_token) {
  return await axios({
      url: `https://api.spotify.com/v1/search?q=${artistName}&type=artist&limit=1`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

app.post('/getRecommendations', async function (req, res) {
  let playlistLength = req.body.playlistLength
  let artistQuery = ""

  let access_token = req.user.userAccessToken;
  let artistInfo = req.cookies.artistInfo

  for(i=0; i < artistInfo.length; i++){
    artistQuery += artistInfo[i].artistId + ","
  }

  artistQuery = artistQuery.slice(0, -1);

  await getRecommendations(artistQuery, playlistLength, access_token).then(function(result) {
    let tracks = []
    let trackURIs = []

    for(i = 0; i < result.data.tracks.length; i++){
      let track = result.data.tracks[i]
      let obj = {
        number: i+1,
        name: track.name,
        artist: track.artists[0].name,
        duration: toMins(track.duration_ms)
      }
      tracks.push(obj)
      trackURIs.push(track.uri)
      res.cookie('URIs', trackURIs)
    }
    res.render('playlist_recommendation', { page_name:'playlist', tracks: tracks });
  })

})

async function getRecommendations(artistQuery, playlistLength, access_token) {
  return await axios({
      url: `https://api.spotify.com/v1/recommendations?seed_artists=${artistQuery}&limit=${playlistLength}`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

function toMins(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

app.post('/makePlaylist', async function (req, res) {
  let playlistName = req.body.playlistName
  let userId = req.user.spotifyId;
  let playlistId = ""
  let access_token = req.user.userAccessToken;
  let trackURIs = req.cookies.URIs

  await makePlaylist(userId, playlistName, access_token).then(function(result) {
    playlistId = result.data.id
  })

  await addToPlaylist(userId, playlistId, trackURIs, access_token).then(function(result) {
    res.clearCookie("URIs");
    res.clearCookie("artistInfo");
    res.render('playlist_random', {page_name: 'playlist', artistInfo: '', alert:'true'});
  })

  User.findOneAndUpdate({ spotifyId: req.user.spotifyId }, { $inc: { reputation: 5 } }, {new: true },function(err, response) {
    if (err) {
      console.log('error update user')
    } else {
    console.log('success update user')
  }
})

})

async function makePlaylist(userId, playlistName, access_token) {
  return await axios({
      url: `https://api.spotify.com/v1/users/${userId}/playlists`,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      },
      data: {
        'name': playlistName
      }
  });
}

async function addToPlaylist(userId, playlistId, trackURIs, access_token) {
  return await axios({
      url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      },
      data: {
        uris: trackURIs
      }
  });
}

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
