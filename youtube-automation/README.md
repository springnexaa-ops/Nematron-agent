# NEXA TECH — YouTube Publishing Automation

This folder provides a Git-style publishing pipeline for the NEXA TECH YouTube channel.

## Flow

1. Create a JSON file under `youtube/queue/`.
2. Set `publish: true`.
3. Provide a reachable MP4 `video_url` and optional `thumbnail_url`.
4. Push the JSON to `main`.
5. GitHub Actions runs the uploader.
6. The uploader authenticates with YouTube using OAuth 2.0, uploads the video, applies metadata, and writes a result file to the workflow artifact.

YouTube requires OAuth 2.0 for authorized uploads. The workflow therefore uses GitHub Actions secrets rather than storing credentials in Git.

## Required GitHub Actions secrets

Configure these repository secrets:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

Never commit these values to the repository.

## Queue format

Copy `youtube/queue/example.json` and change the values. `privacy_status` should initially be `private` or `unlisted` for testing. Change to `public` only after the first successful private upload is verified.

The source video must be a directly downloadable MP4 URL. Do not commit large MP4 files to GitHub.

## First authorization

The OAuth refresh token is generated once using the Google OAuth consent flow for the YouTube account. After that, the GitHub Action can refresh access tokens without requiring an interactive login on every upload.

## Safety

The automation only processes queue files where `publish` is `true`. It does not expose OAuth credentials in logs. The first deployment should use `private` visibility.
