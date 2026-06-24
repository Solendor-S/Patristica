---
description: EAS build for Android — development, preview, or production profile
argument-hint: development | preview | production
---

# EAS Build

Run an EAS build for the Patristica app: $ARGUMENTS

## Instructions

1. cd into `Patristica/` (all app files live there)
2. Determine build profile from `$ARGUMENTS` — default to `development` if not specified
3. Confirm the profile with the user before starting (builds cost EAS build minutes)
4. Run the build:
   ```bash
   cd Patristica && eas build --platform android --profile <profile>
   ```
5. Show the build URL from EAS output so the user can monitor progress
6. For `development` profile: remind user the build produces a `.apk` for testing, not Play Store
7. For `production` profile: remind user to bump version in `app.json` first if needed

## Profiles (from Patristica/eas.json)

- `development` — debug APK for local testing
- `preview` — internal distribution APK
- `production` — Play Store AAB
