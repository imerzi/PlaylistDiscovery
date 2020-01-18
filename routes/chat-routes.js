const router = require('express').Router();
const User = require('../models/user-model');

router.get('/', (req, res) => {
    res.render('chat', {page_name: 'chat', user: req.user});
});

module.exports = router;