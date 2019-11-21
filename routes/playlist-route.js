const router = require('express').Router();
const SpotifyWebApi = require('spotify-web-api-node');
const keys = require('../config/keys');
const Playlist = require('../models/user-playlist');

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

        res.render('playlist_create', {page_name: 'playlist', user: req.user, playlist: playlistUrl});
    },
    function(err) {
      console.log('Something went wrong!', err);
      res.render('spotify', {data: err, user: req.user});
  });
});

module.exports = router;
