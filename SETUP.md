# Solus City — Full Setup Guide (Windows)

This guide walks you through everything needed to run Solus City on a fresh Windows machine.
No prior development experience required — follow each step in order.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Open the Project](#2-open-the-project)
3. [Set Up the Server (.env file)](#3-set-up-the-server-env-file)
4. [Create the PostgreSQL Database](#4-create-the-postgresql-database)
5. [Run the Server](#5-run-the-server)
6. [Set Up and Run the Android App](#6-set-up-and-run-the-android-app)
7. [NPM Dependencies Reference](#7-npm-dependencies-reference)
8. [Common Errors and Fixes](#8-common-errors-and-fixes)

---

## 1. Prerequisites

Install each of the following tools. Do them in order — some depend on others.

---

### Node.js (v22 or higher)

The server and mobile app both run on Node.js.

- **Download:** https://nodejs.org/en/download
- Choose the **LTS** version — make sure it says **22.x or higher**
- Run the installer, keep all default options checked
- When done, open a new Command Prompt and verify:
  ```
  node --version
  ```
  You should see something like `v22.11.0`

---

### Git

Used to clone the project (skip if you already have the folder).

- **Download:** https://git-scm.com/download/win
- Run the installer, keep all defaults
- Verify in Command Prompt:
  ```
  git --version
  ```

---

### PostgreSQL (v16)

The database that stores all game data.

- **Download:** https://www.postgresql.org/download/windows/
- Click **"Download the installer"** → choose **PostgreSQL 16** → Windows x86-64
- During installation:
  - Set a password for the `postgres` user — **write this down**, you will need it
  - Keep the default port: `5432`
  - Keep all other defaults
- Verify in Command Prompt:
  ```
  psql --version
  ```
  If `psql` is not found, add PostgreSQL to your PATH:
  1. Search Windows for **"Edit the system environment variables"**
  2. Click **Environment Variables**
  3. Under **System variables**, find `Path` → click **Edit**
  4. Click **New** and add: `C:\Program Files\PostgreSQL\16\bin`
  5. Click OK on all windows, then open a new Command Prompt and try again

---

### Java JDK 17

Required by Android Studio to build the app.

- **Download:** https://adoptium.net/temurin/releases/?version=17
- Choose: **Windows**, **x64**, **JDK**, **17 - LTS**
- Download the `.msi` installer and run it, keep all defaults
- Verify in a new Command Prompt:
  ```
  java -version
  ```
  You should see `openjdk version "17.x.x"`

---

### Android Studio

The tool used to create Android emulators and build the app.

- **Download:** https://developer.android.com/studio
- Run the installer, keep all defaults
- On first launch, Android Studio will run a setup wizard:
  - Choose **Standard** installation
  - Accept all license agreements
  - Let it download the Android SDK (this takes a few minutes)

After installation, set the `ANDROID_HOME` environment variable:
1. Search Windows for **"Edit the system environment variables"**
2. Click **Environment Variables**
3. Under **User variables**, click **New**:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YourName\AppData\Local\Android\Sdk`
   (replace `YourName` with your actual Windows username)
4. Find the `Path` variable under **User variables** → click **Edit** → **New**, add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
5. Click OK on all windows

Verify in a new Command Prompt:
```
adb --version
```

---

### React Native CLI

The command-line tool to run the mobile app.

- Open Command Prompt and run:
  ```
  npm install -g @react-native-community/cli
  ```
- Verify:
  ```
  npx react-native --version
  ```

---

## 2. Open the Project

If you received the project as a folder, skip to step 3.

If you are cloning from Git:
```
git clone <repository-url> "solus-city"
cd "solus-city"
```

Your folder structure should look like this:
```
solus-city/
├── solus-city-server/
├── soluscitymobile/
├── README.md
└── SETUP.md
```

---

## 3. Set Up the Server (.env file)

The server needs a configuration file to know how to connect to the database.

1. Open Command Prompt and navigate to the server folder:
   ```
   cd "solus-city-server"
   ```

2. Copy the example config file:
   ```
   copy .env.example .env
   ```

3. Open the new `.env` file in Notepad (or any text editor):
   ```
   notepad .env
   ```

4. Fill in the values:
   ```
   DATABASE_URL="postgresql://postgres:YourPassword@localhost:5432/soluscity"
   JWT_SECRET="any-long-random-string-you-make-up-at-least-32-chars"
   PORT=3000
   ```

   - Replace `YourPassword` with the PostgreSQL password you set during installation
   - The `JWT_SECRET` can be anything — just make it long and random (e.g. `xK9mP2wQnR7vT4yL8uB3cE6jA1sD5fH0`)
   - Leave `PORT=3000` as is

5. Save and close Notepad

---

## 4. Create the PostgreSQL Database

You need to create a blank database called `soluscity` before running the server.

1. Open **pgAdmin** (it was installed with PostgreSQL — find it in your Start menu)
   - Or open Command Prompt and run: `psql -U postgres`
   - Enter the password you set during installation

2. In pgAdmin:
   - Expand **Servers** → **PostgreSQL 16** → right-click **Databases** → **Create** → **Database**
   - Name it: `soluscity`
   - Click **Save**

3. If using the command line (`psql`):
   ```sql
   CREATE DATABASE soluscity;
   \q
   ```

---

## 5. Run the Server

Open a Command Prompt and run these commands one at a time:

```
cd "solus-city-server"
```

**Install dependencies** (only needed once):
```
npm install
```

**Run database migrations** (creates all the tables):
```
npm run db:migrate
```
- When it asks for a migration name, type anything, e.g. `init` and press Enter

**Seed the database** (adds the 3 starter shop items):
```
npm run db:seed
```
You should see: `Seeded 3 items.`

**Start the server:**
```
npm run dev
```
You should see:
```
Server listening at http://0.0.0.0:3000
```

To verify it is working, open your browser and go to:
```
http://localhost:3000/health
```
You should see: `{"status":"ok"}`

**Leave this Command Prompt window open** — the server must keep running while you use the app.

---

## 6. Set Up and Run the Android App

### Create an Android Emulator

1. Open **Android Studio**
2. Click **More Actions** → **Virtual Device Manager** (or go to **Tools** → **Device Manager**)
3. Click **Create Device**
4. Choose a phone model — **Pixel 6** is a good choice — click **Next**
5. Download a system image if prompted — choose **API Level 33 (Android 13)** — click **Next**
6. Click **Finish**
7. Click the **Play button** (▶) next to your new device to start it
8. Wait for the emulator to fully boot (you will see the Android home screen)

### Install a Wallet App on the Emulator

The app requires a Solana wallet. Install **Phantom** on the emulator:

1. In the running emulator, open the **Google Play Store**
2. Sign in with a Google account
3. Search for **Phantom** and install it
4. Open Phantom, create or import a wallet, and make sure it is set to **Devnet**:
   - In Phantom: Settings → Developer Settings → Change Network → Devnet

### Install App Dependencies

Open a **new** Command Prompt window (keep the server window open):

```
cd soluscitymobile
npm install
```

### Configure the Server URL

By default, the app points to `http://10.0.2.2:3000` (emulator local setup) and this should work without changes.

If you are running on a **physical phone** instead:
1. Open `soluscitymobile\src\config.ts` in a text editor
2. Find this line:
   ```
   export const API_BASE_URL = "http://10.0.2.2:3000";
   ```
3. Replace `10.0.2.2` with your computer's local IP address
   - Find your IP: open Command Prompt → type `ipconfig` → look for **IPv4 Address** under your Wi-Fi adapter
   - Example: `export const API_BASE_URL = "http://192.168.1.50:3000";`
4. Make sure your phone and computer are on the same Wi-Fi network

### Run the App

Make sure the emulator is running, then:

```
npx react-native run-android
```

This will take a few minutes the first time. The app will install and open automatically on the emulator.

If you see **"No emulators found"**, make sure the emulator is fully booted first.

---

## 7. NPM Dependencies Reference

### solus-city-server — Production Dependencies

| Package | Version | What it does |
|---------|---------|--------------|
| `@prisma/client` | ^5.10.2 | Database ORM — reads and writes to PostgreSQL |
| `bs58` | ^5.0.0 | Decodes base58-encoded Solana signatures |
| `dotenv` | ^16.4.5 | Loads the `.env` config file |
| `fastify` | ^4.26.2 | The web server framework |
| `jsonwebtoken` | ^9.0.2 | Creates and verifies login tokens (JWT) |
| `tweetnacl` | ^1.0.3 | Verifies Solana cryptographic signatures |
| `zod` | ^3.22.4 | Validates incoming API request data |

### solus-city-server — Dev Dependencies

| Package | Version | What it does |
|---------|---------|--------------|
| `@types/jsonwebtoken` | ^9.0.6 | TypeScript types for jsonwebtoken |
| `@types/node` | ^20.11.30 | TypeScript types for Node.js built-ins |
| `prisma` | ^5.10.2 | CLI tool for running migrations and seeding |
| `ts-node` | ^10.9.2 | Runs TypeScript files directly |
| `ts-node-dev` | ^2.0.0 | Like ts-node but restarts on file changes |
| `typescript` | ^5.4.3 | TypeScript compiler |

---

### soluscitymobile — Production Dependencies

| Package | Version | What it does |
|---------|---------|--------------|
| `react` | 19.2.3 | Core React library |
| `react-native` | 0.84.1 | React Native framework |
| `@react-native-async-storage/async-storage` | ^2.1.2 | Stores the login token on the device |
| `@react-navigation/native` | ^7.0.14 | Screen navigation base |
| `@react-navigation/native-stack` | ^7.2.0 | Stack-based screen navigation |
| `@solana-mobile/mobile-wallet-adapter-protocol-web3js` | ^2.1.0 | Connects to Phantom/Solflare wallet on Android |
| `@solana/web3.js` | ^1.98.0 | Solana blockchain utilities (PublicKey encoding) |
| `axios` | ^1.7.9 | Makes HTTP requests to the server |
| `bs58` | ^5.0.0 | Encodes signatures in base58 format |
| `react-native-safe-area-context` | ^5.5.2 | Handles screen notches and safe areas |
| `react-native-screens` | ^4.4.0 | Native screen containers for navigation |

### soluscitymobile — Dev Dependencies

| Package | Version | What it does |
|---------|---------|--------------|
| `@babel/core` | ^7.25.2 | JavaScript compiler (required by RN) |
| `@babel/preset-env` | ^7.25.3 | Babel preset for modern JS |
| `@babel/runtime` | ^7.25.0 | Babel runtime helpers |
| `@react-native-community/cli` | 20.1.0 | React Native command-line tools |
| `@react-native-community/cli-platform-android` | 20.1.0 | Android build tools for RN CLI |
| `@react-native-community/cli-platform-ios` | 20.1.0 | iOS build tools for RN CLI |
| `@react-native/babel-preset` | 0.84.1 | RN-specific Babel configuration |
| `@react-native/eslint-config` | 0.84.1 | Linting rules for React Native |
| `@react-native/metro-config` | 0.84.1 | Metro bundler configuration |
| `@react-native/typescript-config` | 0.84.1 | Base TypeScript config for RN |
| `@types/jest` | ^29.5.13 | TypeScript types for Jest tests |
| `@types/react` | ^19.2.0 | TypeScript types for React |
| `@types/react-test-renderer` | ^19.1.0 | TypeScript types for React test renderer |
| `eslint` | ^8.19.0 | Code linting |
| `jest` | ^29.6.3 | Test runner |
| `prettier` | 2.8.8 | Code formatter |
| `react-test-renderer` | 19.2.3 | React test utilities |
| `typescript` | ^5.8.3 | TypeScript compiler |

---

## 8. Common Errors and Fixes

---

### "node is not recognized" or wrong Node version

**Problem:** Node.js is not installed or is an old version (need v22+).

**Fix:**
1. Go to https://nodejs.org/en/download and download Node.js v22 LTS
2. Run the installer
3. Close and reopen all Command Prompt windows
4. Run `node --version` to confirm

---

### "npm run db:migrate" fails — "Can't reach database server"

**Problem:** PostgreSQL is not running, or the DATABASE_URL in `.env` is wrong.

**Fix — check if PostgreSQL is running:**
1. Press `Win + R`, type `services.msc`, press Enter
2. Find **postgresql-x64-16** in the list
3. If the Status column is empty, right-click it → **Start**
4. Try the migration again

**Fix — check your .env file:**
1. Open `solus-city-server\.env`
2. Make sure `DATABASE_URL` matches exactly:
   ```
   DATABASE_URL="postgresql://postgres:YourActualPassword@localhost:5432/soluscity"
   ```
3. Double-check the password — it is the one you set when installing PostgreSQL

---

### "database soluscity does not exist"

**Problem:** The database was not created yet.

**Fix:**
1. Open pgAdmin or run `psql -U postgres` in Command Prompt
2. Run: `CREATE DATABASE soluscity;`
3. Try the migration again

---

### "npx react-native run-android" — "No emulators found"

**Problem:** The Android emulator is not running.

**Fix:**
1. Open Android Studio
2. Go to **Tools** → **Device Manager**
3. Click the **Play button (▶)** next to your emulator
4. Wait until you see the full Android home screen (not just a loading screen)
5. Run `npx react-native run-android` again

---

### "ANDROID_HOME is not set" or "adb not found"

**Problem:** The Android SDK environment variable is missing.

**Fix:**
1. Find where Android Studio installed the SDK. It is usually at:
   ```
   C:\Users\YourName\AppData\Local\Android\Sdk
   ```
2. Set the environment variable:
   - Search Windows for **"Edit the system environment variables"**
   - Click **Environment Variables**
   - Under **User variables**, click **New**
     - Name: `ANDROID_HOME`
     - Value: `C:\Users\YourName\AppData\Local\Android\Sdk`
   - Find **Path** → Edit → New → add `%ANDROID_HOME%\platform-tools`
3. Close and reopen Command Prompt
4. Run `adb --version` to confirm

---

### "Java not found" or "JAVA_HOME is not set"

**Problem:** Java JDK 17 is not installed or not on the PATH.

**Fix:**
1. Download JDK 17 from https://adoptium.net/temurin/releases/?version=17
2. Run the installer — it sets up JAVA_HOME automatically
3. Open a new Command Prompt and run `java -version`

---

### App shows "Network Error" or cannot connect to server

**Problem:** The app cannot reach the backend server.

**Production (Railway) check:**
- Open `https://<your-service>.up.railway.app/health` in a browser.
- You should see: `{"status":"ok"}`.
- If it does not load, the backend service is not healthy or not deployed to that URL.
**Fix — if using an emulator:**
- The URL must be `http://10.0.2.2:3000` (not `localhost`)
- Check `soluscitymobile\src\config.ts` and confirm `API_BASE_URL = "http://10.0.2.2:3000"`

**Fix — if using a physical phone:**
- Change `API_BASE_URL` to your computer's local IP address
- Find your IP: open Command Prompt → `ipconfig` → look for **IPv4 Address**
- Your phone and computer must be on the same Wi-Fi network

**Fix — check the server is actually running:**
- Go back to the Command Prompt where you ran `npm run dev`
- It should still say `Server listening at http://0.0.0.0:3000`
- If it stopped or shows an error, fix the error and run `npm run dev` again

---

### "Wallet not registered. Call /auth/challenge first."

**Problem:** You tapped Connect Wallet but something failed partway through.

**Fix:** Tap **Connect Wallet** again. The flow retries from scratch each time.

---

### Phantom wallet is not showing up / SMWA error

**Problem:** No compatible wallet app is installed on the emulator or device.

**Fix:**
1. Open the Google Play Store on the emulator
2. Install **Phantom** wallet
3. Open Phantom and complete setup (create or import a wallet)
4. In Phantom: **Settings → Developer Settings → Network → Devnet**
5. Come back to Solus City and tap Connect Wallet

---

### "prisma: command not found" when running migrations

**Problem:** Prisma CLI is not installed or node_modules is missing.

**Fix:**
```
cd solus-city-server
npm install
npm run db:migrate
```

---

### Port 3000 already in use

**Problem:** Something else is already running on port 3000.

**Fix — find and stop the process:**
1. Open Command Prompt and run:
   ```
   netstat -ano | findstr :3000
   ```
2. Note the PID number in the last column
3. Run: `taskkill /PID <number> /F`
4. Try `npm run dev` again

**Or change the port:**
1. Open `solus-city-server\.env`
2. Change `PORT=3000` to `PORT=3001`
3. Update `soluscitymobile\src\config.ts` to match: `http://10.0.2.2:3001`

