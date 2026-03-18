# Solus City Mobile (Android)

This app is the Android client for Solus City.

## Scope

- Platform: Android only
- Framework: React Native
- API target: Solus City backend (`http://10.0.2.2:3000` on emulator)

## Prerequisites

- Node.js 22+
- Android Studio + Android SDK
- Java 17
- An Android emulator or physical Android device

## Install

```sh
cd soluscitymobile
npm install
```

## Run

Start Metro:

```sh
npm start
```

In another terminal, build/run Android:

```sh
npm run android
```

## API Configuration

Edit `src/config.ts` if needed:

- Emulator (local): `http://10.0.2.2:3000`
- Physical device (local LAN): `http://<your-lan-ip>:3000`
- Production (Railway): `https://solus-city-app-production.up.railway.app`

Keep `API_BASE_URL` and `APP_IDENTITY_URI` in sync in `src/config.ts` for release builds.

Behavior updates:
- The client blocks attack actions when `profile.inHospital` is true and shows an estimate of time to recover.
- If any attack call still hits the server while hospitalized, the response includes `code: "IN_HOSPITAL"` and `recoverAt` and is shown as a friendly message.

## Scripts

- `npm run android` - Run Android app
- `npm run start` - Start Metro
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest

## Release APK

Build release APK:

```sh
cd android
./gradlew assembleRelease
```

Output path:

`android/app/build/outputs/apk/release/`

## Notes

- iOS project files were intentionally removed from this workspace.
- If you hit Windows path-length errors on release build, move the repo to a shorter path (for example `C:\src\solus`).
