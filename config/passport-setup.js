const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const keys = require('./keys');
const User = require('../models/user-model');

passport.serializeUser((user, done) => {
    // user.id from mongodb
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    });
});

passport.use(
    new SpotifyStrategy({
        // options for the spotify strategy
        callbackURL: '/auth/spotify/redirect',
        clientID: keys.spotify.clientID,
        clientSecret: keys.spotify.clientSecret
    }, (accessToken, refreshToken, expires_in, profile, done) => {
        // callback function
        // check if user already exists in our db
        User.findOne({spotifyId: profile.id}).then((currentUser) => {
            if (currentUser) {
                // already have a user
                console.log('Current user is: ' + currentUser);
                done(null, currentUser);
            } else {
                // if not create user in our db
                new User({
                    username: profile.displayName,
                    spotifyId: profile.id,
                    thumbnail: profile._json.images[0].url,
                    userAccessToken: accessToken,
                    userRefreshToken: refreshToken,
                    userExpiresIn: expires_in
                }).save().then((newUser) => {
                    console.log('New user created: ' + newUser);
                    done(null, newUser);
                });
            }
        })
    })
)
