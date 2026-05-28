import multer from "multer";
import cloudinary from "../config/cloudinary.js";

// -------------------------------------------------------------------------
// Size Limits
// -------------------------------------------------------------------------

const PDF_MAX_SIZE = 500 * 1024; // 500 KB
const IMAGE_MAX_SIZE = 1 * 1024 * 1024; // 1 MB

// -------------------------------------------------------------------------
// Allowed MIME Types
// -------------------------------------------------------------------------

const PDF_MIME = "application/pdf";
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

// -------------------------------------------------------------------------
// Document field config
// key        = multer field name (matches req.files key)
// type       = "pdf" | "image" | "both"
// multiple   = true for array fields
// -------------------------------------------------------------------------

export const DOCUMENT_FIELDS = [
  { name: "profilePhoto", type: "image", multiple: false },
  { name: "passportPhoto", type: "image", multiple: false },
  { name: "aadhaarCard", type: "both", multiple: false },
  { name: "panCard", type: "both", multiple: false },
  { name: "resume", type: "pdf", multiple: false },
  { name: "offerLetter", type: "pdf", multiple: false },
  { name: "experienceLetter", type: "pdf", multiple: false },
  { name: "educationCertificates", type: "both", multiple: true },
  { name: "signedNDA", type: "pdf", multiple: false },
  { name: "otherDocuments", type: "both", multiple: true },
];

// -------------------------------------------------------------------
// Memory Storage — files available as buffer (no disk writes)
// PDFs  → stored in MongoDB as Buffer
// Images → uploaded to Cloudinary from buffer
// -------------------------------------------------------------------

const storage = multer.memoryStorage();

// -------------------------------------------------------------------
// File Filter — validate MIME type per field rules
// -------------------------------------------------------------------

const fileFilter = (req, file, cb) => {
  const fieldConfig = DOCUMENT_FIELDS.find((f) => f.name === file.fieldname);

  if (!fieldConfig) {
    return cb(new Error(`Unknown upload field: ${file.fieldname}`), false);
  }

  const isPDF = file.mimetype === PDF_MIME;
  const isImage = IMAGE_MIMES.includes(file.mimetype);

  if (fieldConfig.type === "pdf" && !isPDF) {
    return cb(
      new Error(`${file.fieldname} only accepts PDF files`),
      false
    );
  }

  if (fieldConfig.type === "image" && !isImage) {
    return cb(
      new Error(
        `${file.fieldname} only accepts image files (jpg, png, webp)`
      ),
      false
    );
  }

  if (fieldConfig.type === "both" && !isPDF && !isImage) {
    return cb(
      new Error(`${file.fieldname} only accepts PDF or image files`),
      false
    );
  }

  cb(null, true);
};

// ------------------------------------------------------------------------
// Multer Instance
// Hard cap at 1 MB (largest allowed). Per-field validation below.
// ------------------------------------------------------------------------

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: IMAGE_MAX_SIZE },
});

// --------------------------------------------------------------------
// Upload Handler — accepts all document fields in one call
// Usage: router.post("/register", uploadDocuments, registerEmployee)
// --------------------------------------------------------------------

export const uploadDocuments = upload.fields(
  DOCUMENT_FIELDS.map((f) => ({
    name: f.name,
    maxCount: f.multiple ? 10 : 1,
  }))
);

// ---------------------------------------------------------------------------
// Per-Field Size Validator  (called inside the controller)
// Returns an array of error strings, or empty array if all files are valid.
// PDF  → 500 KB max
// Image → 1 MB max
// ---------------------------------------------------------------------------

export const validateFileSizes = (files = {}) => {
  const errors = [];

  for (const [fieldName, fileArray] of Object.entries(files)) {
    const fieldConfig = DOCUMENT_FIELDS.find((f) => f.name === fieldName);
    if (!fieldConfig) continue;

    for (const file of fileArray) {
      const isPDF = file.mimetype === PDF_MIME;
      const limit = isPDF ? PDF_MAX_SIZE : IMAGE_MAX_SIZE;
      const label = isPDF ? "500 KB" : "1 MB";

      if (file.size > limit) {
        errors.push(
          `${fieldName}: "${file.originalname}" exceeds the ${label} size limit for ${isPDF ? "PDF" : "image"} files`
        );
      }
    }
  }

  return errors;
};

// ---------------------------------------------------------------------------
// Cloudinary Upload Helper  (from buffer)
// Returns { secure_url, public_id }
// ---------------------------------------------------------------------------

export const uploadToCloudinary = (buffer, folder = "employees") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
};

// ---------------------------------------------------------------------------
// Cloudinary Delete Helper
// ---------------------------------------------------------------------------

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
  }
};