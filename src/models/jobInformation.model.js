import mongoose from "mongoose";

const jobInformationSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // Link to Parent Employee (one-to-one)
    // ─────────────────────────────────────────
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
    },

    // ─────────────────────────────────────────
    // Job Details
    // ─────────────────────────────────────────
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },
    employeeType: {
      type: String,
      enum: ["Full Time", "Part Time", "Intern", "Contract"],
      required: [true, "Employee Type is required"],
    },
    workLocation: {
      type: String,
      trim: true,
      default: null,
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining Date is required"],
    },
    probationEndDate: {
      type: Date,
      default: null,
    },
    shiftTiming: {
      type: String,
      trim: true,
      default: null,
    },
    workMode: {
      type: String,
      enum: ["Remote", "Hybrid", "Office"],
      default: "Office",
    },
    employmentStatus: {
      type: String,
      enum: ["Active", "Notice Period", "Resigned", "Terminated"],
      default: "Active",
    },

    // ─────────────────────────────────────────
    // Reporting Manager (optional self-ref)
    // ─────────────────────────────────────────
    // reportingManager: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Employee",
    //   default: null,
    // },
  },
  { timestamps: true }
);

const JobInformationModel = mongoose.model(
  "JobInformation",
  jobInformationSchema
);
export default JobInformationModel;
