const router = require('express').Router();
const passport = require('passport');

// auth logout
router.get('/logout', (req, res) => {
    // logout handle with passport
    req.logout()
    res.redirect('/');
});

// auth with spotify
router.get('/spotify', passport.authenticate('spotify', {
    scope: [
        'user-read-email',
        'user-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private',
        'playlist-read-private'],
    showDialog: true
}));

// callback route for spotify to redirect
router.get('/spotify/redirect', passport.authenticate('spotify'), (req, res) => {
    res.cookie('code', req.query.code)
    res.redirect('/profile');
});

module.exports = router;