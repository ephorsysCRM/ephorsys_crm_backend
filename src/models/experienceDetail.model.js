import mongoose from "mongoose";

const experienceDetailSchema = new mongoose.Schema(
  {
    // -----------------------------------------
    // Link to Parent Employee (one-to-many)
    // -----------------------------------------
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // -----------------------------------------
    // Experience Info
    // -----------------------------------------
    companyName: {
      type: String,
      trim: true,
      default: null,
    },
    designation: {
      type: String,
      trim: true,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    totalExperience: {
      type: String,
      trim: true,
      default: null,
    },
    skillsUsed: [{ type: String, trim: true }],
    reasonForLeaving: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const ExperienceDetailModel = mongoose.model(
  "ExperienceDetail",
  experienceDetailSchema
);
export default ExperienceDetailModel;
