const router = require('express').Router();

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
    res.render('profile', {page_name: 'profile', user: req.user});
});

module.exports = router;