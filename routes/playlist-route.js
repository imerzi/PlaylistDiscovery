const router = require('express').Router();
const SpotifyWebApi = require('spotify-web-api-node');
const keys = require('../config/keys');
const Playlist = require('../models/user-playlist');
var bodyParser = require('body-parser')

// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var spotifyApi = new SpotifyWebApi({
  clientId: keys.spotify.clientID,
  clientSecret: keys.spotify.clientSecret,
  redirectUri: keys.redirectUri
});

function newToken(){
  spotifyApi.clientCredentialsGrant().then(
      function(data) {

          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body['access_token']);
      },
      function(err) {
        console.log("ERROR: refresh token");
      }
  );
}

//When the app starts, you might want to immediately get a new token
newToken();

//And set an interval to "refresh" it (actually creating a new one) every hour
tokenRefreshInterval = setInterval(newToken, 1000 * 60 * 60);

router.get('/', (req, res) => {
    Playlist.find({}, function(err, playlists) {
        console.log(playlists);
        res.render('playlist_discover', {page_name: 'playlist', user: req.user, lists: playlists});
    });
});

router.get('/create', (req, res) => {

    spotifyApi.getUserPlaylists(req.user.spotifyId).then(
      function(data) {
        let playlistUrl = [];
        // SAVE PLAYLIST ID TO PLAYLIST MODEL LINK TO USER
        data.body.items.forEach(function (item) {
          Playlist.findOne({playlistId: item.id}).then((currentPlaylist) => {
            if (currentPlaylist) {
              // already have this playlist
              console.log('playlist is: ' + currentPlaylist);
            } else {
              // create new playlist
              new Playlist({
                user: req.user._id,
                playlistId: item.id,
                likes: 0
              }).save().then((newPlaylist) => {
                console.log('playlist created: ' + newPlaylist);
              });
            }
          })
          playlistUrl.push('https://open.spotify.com/embed/playlist/' + item.id);
      });
        res.render('playlist_create', {page_name: 'playlist', user: req.user, playlist: playlistUrl, song: ''});
    },
    function(err) {
      console.log('Something went wrong!', err);
      res.render('spotify', {data: err, user: req.user});
  });
});

router.post('/searchSong', async function(req, res) {
  spotifyApi.searchTracks(req.body.songs, {limit: 50, offset: 1}).then(
    function(data) {
      let song = [];
      data.body.tracks.items.forEach(function (item) {
        let track = item.uri.split(':');
        let elem = {
          image: item.album.images[0].url,
          artist: item.artists[0].name,
          name: item.name,
          url: track[2]
        }
        song.push(elem);
      });
      res.render('playlist_create', {page_name: 'playlist', song: song});
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  );
});

router.post('/addPlaylist', async function(req, res) {
  console.log(req.body);

  for (let elem in req.body) {
    console.log(elem);
  }

  spotifyApi.createPlaylist(req.user.spotifyId, req.body.playlistName, { 'public' : false })
  .then(function(data) {
    console.log('Created playlist!');
    console.log(data);
  }, function(err) {
    console.log('Something went wrong!', err);
  });

});

module.exports = router;
