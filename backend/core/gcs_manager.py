import base64
import os
import tempfile
from google.cloud import storage
import datetime
import json

def _get_gcs_bucket():
    """
    Helper function to initialize the GCS client and get the bucket object.
    This should be called by each function that needs to interact with GCS.
    """
    bucket_name = os.environ.get("GCS_BUCKET_NAME")
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if not bucket_name:
        raise ValueError("GCS_BUCKET_NAME environment variable not set.")
    if not credentials_path or not os.path.exists(credentials_path):
        raise ValueError(
            "GOOGLE_APPLICATION_CREDENTIALS path is not set or file does not exist."
        )

    storage_client = storage.Client.from_service_account_json(credentials_path)
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