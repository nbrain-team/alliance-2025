import base64
import os
import tempfile
from google.cloud import storage
from google.oauth2 import service_account
import datetime
import json

def _get_gcs_bucket():
    """
    Helper function to initialize the GCS client and get the bucket object.
    This is robust to different environment setups (local file vs. Render secret).
    """
    bucket_name = os.environ.get("GCS_BUCKET_NAME")
    if not bucket_name:
        raise ValueError("GCS_BUCKET_NAME environment variable not set.")

    creds_json_str = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if creds_json_str:
        # Render/production: Load credentials from environment variable content
        try:
            creds_info = json.loads(creds_json_str)
            credentials = service_account.Credentials.from_service_account_info(creds_info)
            storage_client = storage.Client(credentials=credentials)
        except json.JSONDecodeError:
            raise ValueError("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON.")
    elif creds_path and os.path.exists(creds_path):
        # Local development: Load credentials from file path
        storage_client = storage.Client.from_service_account_json(creds_path)
    else:
        raise ValueError(
            "Could not find Google Cloud credentials. "
            "Set either GOOGLE_APPLICATION_CREDENTIALS_JSON (as a string) "
            "or GOOGLE_APPLICATION_CREDENTIALS (as a file path)."
        )
    
    return storage_client.bucket(bucket_name)

def generate_upload_url(file_name: str, content_type: str) -> str:
    """Generates a v4 signed URL for uploading a file."""
    bucket = _get_gcs_bucket()
    blob = bucket.blob(file_name)
    
    expiration_time = datetime.timedelta(hours=1)
    
    url = blob.generate_signed_url(
        version="v4",
        expiration=expiration_time,
        method="PUT",
        content_type=content_type,
    )
    return url

def download_to_temp_file(file_name: str, temp_file_path: str):
    """Downloads a blob from the bucket to a temporary local file."""
    bucket = _get_gcs_bucket()
    blob = bucket.blob(file_name)
    blob.download_to_filename(temp_file_path)

def delete_file(file_name: str):
    """Deletes a blob from the bucket."""
    bucket = _get_gcs_bucket()
    blob = bucket.blob(file_name)
    # The delete operation can fail if the blob does not exist.
    # We add a check to handle this case gracefully.
    if blob.exists():
        blob.delete() 