import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // Link to Parent Employee (one-to-many)
    // ─────────────────────────────────────────
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // ─────────────────────────────────────────
    // Document Metadata
    // ─────────────────────────────────────────
    fieldName: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "aadhaarCard",
        "panCard",
        "resume",
        "offerLetter",
        "experienceLetter",
        "educationCertificates",
        "passportPhoto",
        "signedNDA",
        "otherDocuments",
      ],
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },

    // ─────────────────────────────────────────
    // PDF  →  stored as raw binary in MongoDB
    // ─────────────────────────────────────────
    fileData: {
      type: Buffer,
      default: null,
    },

    // ─────────────────────────────────────────
    // Image  →  stored as Cloudinary URL
    // ─────────────────────────────────────────
    fileUrl: {
      type: String,
      default: null,
    },
    cloudinaryId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const DocumentModel = mongoose.model("Document", documentSchema);
export default DocumentModel;
