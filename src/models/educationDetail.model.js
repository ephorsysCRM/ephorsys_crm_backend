import mongoose from "mongoose";

const educationDetailSchema = new mongoose.Schema(
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
    // Education Info
    // ─────────────────────────────────────────
    qualification: {
      type: String,
      trim: true,
      default: null,
    },
    university: {
      type: String,
      trim: true,
      default: null,
    },
    passingYear: {
      type: String,
      trim: true,
      default: null,
    },
    percentage: {
      type: String,
      trim: true,
      default: null,
    },
    specialization: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const EducationDetailModel = mongoose.model(
  "EducationDetail",
  educationDetailSchema
);
export default EducationDetailModel;
