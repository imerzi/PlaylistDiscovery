const router = require('express').Router();
const SpotifyWebApi = require('spotify-web-api-node');
const keys = require('../config/keys');
const Playlist = require('../models/user-playlist');
var bodyParser = require('body-parser')
const request = require('request');
const User = require('../models/user-model');
const axios = require('axios');

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
        res.render('playlist_create', {page_name: 'playlist', user: req.user, playlist: playlistUrl, song: '', alert: 'false'});
    },
    function(err) {
      console.log('Something went wrong!', err);
      res.render('playlist_create', {page_name: 'playlist', user: req.user, song: '', alert: 'false'});
  });
});

router.post('/searchSong', async function(req, res) {
  spotifyApi.searchTracks(req.body.songs, {limit: 20, offset: 1}).then(
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
      res.render('playlist_create', {page_name: 'playlist', song: song, alert:'false'});
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  );
});

router.post('/addPlaylist', async function(req, res) {

  var trackURIs = []
  for (let elem in req.body) {
    if (elem != "playlistName") {
      trackURIs.push("spotify:track:" + elem);
    }
  }

    await makePlaylist(req.user.spotifyId, req.body.playlistName, req.user.userAccessToken).then(function(result) {
      playlistId = result.data.id
    })
  
    await addToPlaylist(req.user.spotifyId, playlistId, trackURIs, req.user.userAccessToken).then(function(result) {
      res.render('playlist_create', {page_name: 'playlist', user: req.user, song: '', alert:'true'});
    })

    User.findOneAndUpdate({ spotifyId: req.user.spotifyId }, { $inc: { reputation: 5 } }, {new: true },function(err, response) {
      if (err) {
        console.log('error update user')
      } else {
      console.log('success update user')
    }
  })
});

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

module.exports = router;
