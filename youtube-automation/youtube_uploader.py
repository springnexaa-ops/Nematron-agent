import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_queue(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if data.get("publish") is not True:
        fail("Queue item must contain publish: true")
    required = ["title", "description", "video_url"]
    missing = [key for key in required if not data.get(key)]
    if missing:
        fail(f"Missing required fields: {', '.join(missing)}")
    if len(data["title"]) > 100:
        fail("YouTube title must be 100 characters or fewer")
    return data


def get_credentials() -> Credentials:
    client_id = os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
    refresh_token = os.environ.get("YOUTUBE_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        fail("YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN secrets are required")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return creds


def download(url: str, destination: Path) -> None:
    with requests.get(url, stream=True, timeout=120, allow_redirects=True) as response:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if not (content_type.startswith("video/") or destination.suffix.lower() == ".mp4"):
            print(f"Warning: source content-type is {content_type!r}")
        with destination.open("wb") as fh:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    fh.write(chunk)


def upload(youtube, data: dict, video_path: Path) -> str:
    status = {
        "privacyStatus": data.get("privacy_status", "private"),
        "selfDeclaredMadeForKids": bool(data.get("made_for_kids", False)),
        "containsSyntheticMedia": bool(data.get("contains_synthetic_media", False)),
    }

    body = {
        "snippet": {
            "title": data["title"],
            "description": data["description"],
            "tags": data.get("tags", []),
            "categoryId": str(data.get("category_id", "28")),
            "defaultLanguage": data.get("default_language", "en"),
        },
        "status": status,
    }

    media = MediaFileUpload(str(video_path), chunksize=8 * 1024 * 1024, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        try:
            progress, response = request.next_chunk()
            if progress:
                print(f"Upload progress: {int(progress.progress() * 100)}%")
        except HttpError as exc:
            if exc.resp.status in (500, 502, 503, 504):
                continue
            raise

    video_id = response["id"]
    print(f"Uploaded video: https://www.youtube.com/watch?v={video_id}")
    return video_id


def set_thumbnail(youtube, video_id: str, thumbnail_url: str) -> None:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as fh:
        thumbnail_path = Path(fh.name)
    try:
        with requests.get(thumbnail_url, stream=True, timeout=60) as response:
            response.raise_for_status()
            with thumbnail_path.open("wb") as fh:
                for chunk in response.iter_content(chunk_size=256 * 1024):
                    if chunk:
                        fh.write(chunk)
        youtube.thumbnails().set(
            videoId=video_id,
            media_body=MediaFileUpload(str(thumbnail_path), mimetype="image/jpeg"),
        ).execute()
        print("Thumbnail uploaded")
    finally:
        thumbnail_path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("queue_file")
    parser.add_argument("--result", default="youtube-result.json")
    args = parser.parse_args()

    data = load_queue(args.queue_file)
    creds = get_credentials()
    youtube = build(API_SERVICE_NAME, API_VERSION, credentials=creds)

    with tempfile.TemporaryDirectory() as temp_dir:
        video_path = Path(temp_dir) / "video.mp4"
        print("Downloading source video...")
        download(data["video_url"], video_path)
        print("Uploading to YouTube...")
        video_id = upload(youtube, data, video_path)

        if data.get("thumbnail_url"):
            set_thumbnail(youtube, video_id, data["thumbnail_url"])

    result = {
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "title": data["title"],
        "privacy_status": data.get("privacy_status", "private"),
        "queue_file": args.queue_file,
    }
    with open(args.result, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
