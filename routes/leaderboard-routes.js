const router = require('express').Router();
const User = require('../models/user-model');

router.get('/user', (req, res) => {

    User.find({}).sort('-reputation').exec(function(err, users) {
        res.render('leaderboard_user', {page_name: 'leaderboard', user: req.user, users:users});
    })
});

router.get('/playlist', (req, res) => {
    res.render('leaderboard_playlist', {page_name: 'leaderboard', user: req.user});
});

module.exports = router;