# scripts/code.py

import boto3
import os
import json
import logging
from botocore.exceptions import NoCredentialsError
import datetime
import uuid
import tempfile
import re
import sys

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# AWS Configuration
def get_s3_client():
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION', 'us-east-1')
        )
        return s3
    except Exception as e:
        logging.error(f"Error initializing S3 client: {e}")
        sys.exit(1)

s3 = get_s3_client()
bucket_name = os.environ.get('S3_BUCKET_NAME', 'kevin-policy-bucket')

# Process Function
def process_file(file_key):
    """
    Process the file to generate a compliance report.
    """

    try:
        logging.info(f"Downloading file: {file_key} from S3")

        # Download file from S3 to a temporary directory
        with tempfile.TemporaryDirectory() as tmpdirname:
            download_path = os.path.join(tmpdirname, os.path.basename(file_key))
            s3.download_file(bucket_name, file_key, download_path)
            logging.info(f"File downloaded to {download_path}")

            # Simulate processing the file
            logging.info("Processing the file...")
            compliance_report = {
                "report_id": str(uuid.uuid4()),
                "file_key": file_key,
                "s3_url": f"https://{bucket_name}.s3.amazonaws.com/{file_key}",
                "processed_at": datetime.datetime.utcnow().isoformat() + "Z",
                "status": "Success",
                "summary": "This is a dummy compliance report for demonstration purposes.",
                "details": [
                    {"control": "AC-1", "status": "Compliant"},
                    {"control": "AC-2", "status": "Partially Compliant"},
                    {"control": "AC-3", "status": "Non-Compliant"}
                ]
            }

            # Save compliance report to a JSON file in temporary directory
            output_file = os.path.join(tmpdirname, f"compliance_report_{uuid.uuid4()}.json")
            with open(output_file, "w") as f:
                json.dump(compliance_report, f, indent=4)
            logging.info(f"Compliance report generated: {output_file}")

            # Upload the report to S3
            upload_key = f"reports/compliance_report_{uuid.uuid4()}.json"
            s3.upload_file(output_file, bucket_name, upload_key)
            logging.info(f"Compliance report uploaded to S3: {upload_key}")

            s3_url = f"https://{bucket_name}.s3.amazonaws.com/{upload_key}"
            logging.info(f"Compliance report S3 URL: {s3_url}")

            return {"message": "Processing complete", "report_key": upload_key, "report_url": s3_url}

    except NoCredentialsError:
        logging.error("AWS credentials not found.")
        return {"error": "AWS credentials not configured properly"}
    except Exception as e:
        logging.error(f"Error processing file: {e}")
        return {"error": str(e)}

# Main Workflow
if __name__ == "__main__":
    if len(sys.argv) != 2:
        logging.error("Usage: python3 code.py <s3_key>")
        sys.exit(1)

    s3_key = sys.argv[1]
    logging.info(f"Received S3 Key: {s3_key}")
    logging.info("Starting AI processing workflow...")
    result = process_file(s3_key)
    logging.info(f"Result: {result}")
    print(json.dumps(result))

