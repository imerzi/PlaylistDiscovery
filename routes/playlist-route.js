const router = require('express').Router();
const SpotifyWebApi = require('spotify-web-api-node');
const keys = require('../config/keys');
const Playlist = require('../models/user-playlist');
var bodyParser = require('body-parser')
const request = require('request');
const User = require('../models/user-model');

var redirect_uri = keys.spotify.redirectUri;

var spotifyApi = new SpotifyWebApi({
  clientId: keys.spotify.clientID,
  clientSecret: keys.spotify.clientSecret,
  redirectUri: keys.spotify.redirectUri
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
            } else {
              // create new playlist
              new Playlist({
                user: req.user._id,
                playlistId: item.id,
                likes: 0
              }).save().then((newPlaylist) => {
              });
            }
          })
          playlistUrl.push('https://open.spotify.com/embed/playlist/' + item.id);
      });
        res.render('playlist_create', {page_name: 'playlist', user: req.user, playlist: playlistUrl, song: ''});
    },
    function(err) {
      console.log('Something went wrong!', err);
      res.render('playlist_create', {page_name: 'playlist', user: req.user, song: ''});
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


  // for (let elem in req.body) {
  //   console.log(elem);
  // }

  // let authOptions = {
  //   url: 'https://accounts.spotify.com/api/token',
  //   form: {
  //     code: req.cookies.code,
  //     redirect_uri,
  //     grant_type: 'authorization_code'
  //   },
  //   headers: {
  //     'Authorization': 'Basic ' + (new Buffer(
  //       keys.spotify.clientID + ':' + keys.spotify.clientSecret
  //     ).toString('base64'))
  //   },
  //   json: true
  // }
  // request.post(authOptions, function(error, response, body) {
  //   console.log(response);
  //   res.cookie('access_token', body.access_token)
  // })

    var createPlaylist = {
        url: `https://api.spotify.com/v1/users/${req.user.spotifyId}/playlists`,
        body: JSON.stringify({
            'name': req.body.playlistName,
            'public': false
        }),
        dataType:'json',
        headers: {
            'Authorization': 'Bearer ' + req.user.userAccessToken,
            'Content-Type': 'application/json',
        }
    };

    request.post(createPlaylist, function(err, res, body) {
        console.log(body);
    });
});

module.exports = router;
