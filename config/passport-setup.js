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
                // update user token if already exists in db
                currentUser.userAccessToken = accessToken;
                currentUser.userRefreshToken = refreshToken;
                currentUser.save(function(err) {
                  if (err)
                    console.log('error update user')
                  else
                    console.log('success update user')
                });
                // already have a user
                done(null, currentUser);
            } else {
                // if not create user in our db
                new User({
                    username: profile.displayName,
                    spotifyId: profile.id,
                    thumbnail: profile._json.images[0].url,
                    thumbnail: '',
                    userAccessToken: accessToken,
                    userRefreshToken: refreshToken,
                    userExpiresIn: expires_in,
                    reputation: 0
                }).save().then((newUser) => {
                    done(null, newUser);
                });
            }
        })
    })
)
