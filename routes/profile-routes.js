const router = require('express').Router();
const Playlist = require('../models/user-playlist');

const authCheck = (req, res, next) => {
    if(!req.user) {
        // if user is not logged in
        res.redirect('/');
    } else {
        // if user is logged in
        next();
    }
};

router.get('/', authCheck, (req, res) => {
    Playlist.find({user: req.user.id}).then((userPlaylists) => {
        if (userPlaylists) {
            res.render('profile', {page_name: 'profile', user: req.user, playlists:userPlaylists});
        }
        else {
            res.render('profile', {page_name: 'profile', user: req.user, playlists: ''});
        }
      })
});

module.exports = router;