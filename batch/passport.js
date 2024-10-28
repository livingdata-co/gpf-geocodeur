import process from 'node:process'

import passport from 'passport'
import OAuth2Strategy from 'passport-oauth2'

import {readTokenData} from './util/gpf.js'

export function configure() {
  passport.use('gpf', new OAuth2Strategy(
    {
      authorizationURL: process.env.GPF_AUTHORIZATION_URL,
      tokenURL: process.env.GPF_TOKEN_URL,
      clientID: process.env.GPF_CLIENT_ID,
      clientSecret: process.env.GPF_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL}/async/auth/gpf/callback`
    },
    (accessToken, refreshToken, profile, done) => {
      const tokenContent = readTokenData(accessToken)

      const {name, email} = tokenContent
      const isAdmin = tokenContent.realm_access.roles.includes(process.env.GPF_ADMIN_ROLE)

      return done(null, {name, email, isAdmin})
    }
  ))

  passport.serializeUser((user, done) => done(null, user))
  passport.deserializeUser((user, done) => done(null, user))
}

