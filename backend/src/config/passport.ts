import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";

import {
  handleGoogleLogin,
  handleGithubLogin,
} from "../services/oauth.service";
import { findUserById } from "../repositories/user.repository";

const hasGoogleCredentials =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const hasGithubCredentials =
  !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

if (hasGoogleCredentials) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${process.env.APP_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await handleGoogleLogin(profile);
          done(null, user as any);
        } catch (err) {
          done(err as Error, false);
        }
      },
    ),
  );
}

if (hasGithubCredentials) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: `${process.env.APP_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any,
      ) => {
        try {
          const user = await handleGithubLogin(profile);
          done(null, user);
        } catch (error) {
          done(error as Error, false);
        }
      },
    ),
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await findUserById(id);
    done(null, user as any);
  } catch (err) {
    done(err, null);
  }
});

/* ======================================================
   EXPORT AVAILABLE PROVIDERS
====================================================== */
export const oauthAvailable = {
  google: hasGoogleCredentials,
  github: hasGithubCredentials,
};

export default passport;
