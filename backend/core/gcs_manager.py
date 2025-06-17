import base64
import os
import tempfile
from google.cloud import storage
import datetime
import json

class GCSManager:
    def __init__(self):
        self.bucket_name = os.environ.get("GCS_BUCKET_NAME")
        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME environment variable not set.")

        gcs_creds_base64 = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_BASE64")
        if not gcs_creds_base64:
            raise ValueError("GOOGLE_APPLICATION_CREDENTIALS_BASE64 is not set.")

        try:
            creds_json_str = base64.b64decode(gcs_creds_base64).decode("utf-8")
            creds_info = json.loads(creds_json_str)

            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as temp_creds:
                json.dump(creds_info, temp_creds)
                temp_creds_path = temp_creds.name
            
            self.storage_client = storage.Client.from_service_account_json(temp_creds_path)
            
            # Clean up the temporary file after the client has been initialized
            os.remove(temp_creds_path)

        except Exception as e:
            raise RuntimeError(f"Failed to initialize GCSManager from Base64 credentials: {e}")

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