# NEXA TECH publishing queue

Place one JSON metadata file per video in this directory.

Required fields:
- publish: true
- title
- description
- video_url

Optional:
- thumbnail_url
- tags
- category_id
- default_language
- privacy_status
- made_for_kids
- contains_synthetic_media

Use `privacy_status: private` for the first test. The workflow publishes only queue files that changed in the commit and have `publish` set to true.

Do not store OAuth credentials in queue files.
