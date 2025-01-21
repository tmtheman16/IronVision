// s3Service.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import path from "path";

interface FetchFileParams {
  key: string;
}
/**
 * Interface for upload parameters
 */
interface UploadParams {
  fileBuffer: Buffer;
  originalName: string;
  folderName?: string;
}

/**
 * Interface for upload result
 */
interface UploadResult {
  key: string;
  url: string;
}
export async function fetchJsonFromS3(s3Key: string): Promise<any> {
  const { REGION_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME } =
    process.env;
  if (
    !REGION_NAME ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !BUCKET_NAME
  ) {
    throw new Error("AWS configuration environment variables are missing.");
  }

  const s3Client = new S3Client({
    region: REGION_NAME,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const s3Response = await s3Client.send(command);

  if (!s3Response.Body) {
    throw new Error("File not found in S3.");
  }

  const stream = s3Response.Body as Readable;
  const chunks: Buffer[] = [];

  return new Promise<any>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => {
      console.error("Error reading S3 stream:", err);
      reject(new Error("Error reading file from S3."));
    });
    stream.on("end", () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        const jsonString = fileBuffer.toString("utf-8");
        const jsonData = JSON.parse(jsonString);
        resolve(jsonData);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        reject(new Error("Error parsing JSON file."));
      }
    });
  });
}

// s3Service.ts

export async function uploadFileToS3(
  params: UploadParams
): Promise<UploadResult> {
  const { fileBuffer, originalName, folderName = "uploads" } = params;

  // Validate environment variables
  const { REGION_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME } =
    process.env;
  if (
    !REGION_NAME ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !BUCKET_NAME
  ) {
    throw new Error("AWS configuration environment variables are missing.");
  }

  // Initialize S3 Client
  const s3 = new AWS.S3({
    region: REGION_NAME,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  });

  // Generate a unique key for the file
  const fileExtension = path.extname(originalName);
  const uniqueKey = `${uuidv4()}${fileExtension}`;
  const s3Key = `${folderName}/${uniqueKey}`;

  // Prepare upload parameters
  const uploadParams: AWS.S3.PutObjectRequest = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: getContentType(fileExtension),
  };

  try {
    // Upload file to S3
    const data = await s3.upload(uploadParams).promise();

    // Return the S3 key and URL
    return {
      key: s3Key,
      url: data.Location,
    };
  } catch (error: any) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3.");
  }
}

function getContentType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // Add more MIME types as needed
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
}

export async function fetchFileFromS3({
  key,
}: FetchFileParams): Promise<Buffer | null> {
  const { REGION_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME } =
    process.env;

  if (
    !REGION_NAME ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !BUCKET_NAME
  ) {
    throw new Error("AWS configuration environment variables are missing.");
  }

  const s3Client = new S3Client({
    region: REGION_NAME,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    if (!response.Body) {
      return null;
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return await new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (err) => {
        console.error("Error reading S3 stream:", err);
        reject(err);
      });
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });
  } catch (error) {
    console.error("Error fetching file from S3:", error);
    return null;
  }
}
