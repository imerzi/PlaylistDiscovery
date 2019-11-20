const express = require('express');
const mongoose = require('mongoose');
const keys = require('./config/keys');
const passportSetup = require('./config/passport-setup');
const passport = require('passport')
const cors = require('cors');
const cookieSession = require('cookie-session');
const app = express();

const profileRoutes = require('./routes/profile-routes');
const authRoutes = require('./routes/auth-routes');

const DATABASE_HOST_NAME = 'localhost';
const DATABASE_NAME = 'playlistDiscovery';

app.use(cors());

//set up view engine
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/css'));
app.use(express.static(__dirname + '/images'));

// set session cookie to 24 hours and encrypt cookie
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000, // day in millisecondes
    keys: [keys.session.cookieKey]
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.Promise = global.Promise

//connect to mongodb
mongoose.connect('mongodb://' + DATABASE_HOST_NAME + '/' + DATABASE_NAME, () => {
    console.log('Connected to mongodb');
});

// set up routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
// app.use('/spotify', spotifyRoutes);

//create home route
app.get('/', (req, res) => {
    if (!req.user) {
        res.render('home');
    } else {
        res.render('profile', {page_name: 'profile', user: req.user});
    }
});

// start server
app.listen(3000, () => {
    console.log('App now listening or requests on port 3000');
});
