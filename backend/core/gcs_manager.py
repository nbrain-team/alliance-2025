import base64
import os
import tempfile
from google.cloud import storage
import datetime
import json

class GCSManager:
    def __init__(self):
        self.bucket_name = os.environ.get("GCS_BUCKET_NAME")
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME environment variable not set.")
        if not credentials_path:
            raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")

        # Explicitly use the service account credentials from the file path
        self.storage_client = storage.Client.from_service_account_json(credentials_path)
        self.bucket = self.storage_client.bucket(self.bucket_name)

    def generate_upload_url(self, file_name: str, content_type: str) -> str:
        """Generates a v4 signed URL for uploading a file."""
        blob = self.bucket.blob(file_name)
        
        # URL expires in 1 hour
        expiration_time = datetime.timedelta(hours=1)
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=expiration_time,
            method="PUT",
            content_type=content_type,
        )
        return url
        
    def download_to_temp_file(self, file_name: str, temp_file_path: str):
        """Downloads a blob from the bucket to a temporary local file."""
        blob = self.bucket.blob(file_name)
        blob.download_to_filename(temp_file_path)

    def delete_file(self, file_name: str):
        """Deletes a blob from the bucket."""
        blob = self.bucket.blob(file_name)
        blob.delete() 