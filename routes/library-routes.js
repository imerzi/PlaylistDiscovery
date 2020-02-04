const router = require('express').Router();
const request = require('request');
const axios = require('axios');

router.get('/tracks', (req, res) => {
    getTopTracks(req.user.userAccessToken).then(function(result) {
        let tracks = [];
        result.data.items.forEach(elem => {
            let uri = elem.uri.split(':');
            tracks.push(uri[2]);
        });
        res.render('library_tracks', { page_name: 'library', tracks:tracks});
      }, function (err) {
          console.log("error", err);
      });
});

router.get('/artists', (req, res) => {
    getTopArtists(req.user.userAccessToken).then(function(result) {
        let artists = [];
        result.data.items.forEach(item => {
            let elem = {
                image: item.images[0].url,
                name: item.name
            }
            artists.push(elem);
        });
        res.render('library_artists', { page_name: 'library', artists:artists});        
      }, function(err) {
          console.log("error", err);
      });
});

function getTopTracks(access_token) {
    return axios({
        url: `https://api.spotify.com/v1/me/top/tracks`,
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token,
        }
    });
}

async function getTopArtists(access_token) {
    return axios({
        url: `https://api.spotify.com/v1/me/top/artists`,
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token,
        }
    });
}


module.exports = router;