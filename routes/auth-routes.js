const router = require('express').Router();
const passport = require('passport');

// auth login
// router.get('/login', (req, res) => {
//     res.render('login', {user: req.user});
// });

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
        'playlist-read-private',
        'playlist-modify-public'],
    showDialog: true
}));

// callback route for spotify to redirect
router.get('/spotify/redirect', passport.authenticate('spotify'), (req, res) => {
    // res.send(req.user);
    res.redirect('/profile');
});

module.exports = router;