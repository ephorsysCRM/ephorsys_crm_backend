import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const employeeSchema = new mongoose.Schema(
  {
    // -------------------------------------
    // 1. Personal Information
    // -------------------------------------
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First Name is required"],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      required: [true, "Last Name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of Birth is required"],
    },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
      default: "Single",
    },
    profilePhoto: {
      type: String, // Cloudinary URL
      default: null,
    },
    profilePhotoCloudinaryId: {
      type: String, // Cloudinary public_id for deletion
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: null,
    },
    nationality: {
      type: String,
      trim: true,
      default: "Indian",
    },

    // ------------------------------------------
    // 2. Contact Information
    // ------------------------------------------

    personalEmail: {
      type: String,
      required: [true, "Personal Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    officialEmail: {
      type: String,
      required: [true, "Official Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile Number is required"],
      trim: true,
    },
    alternateMobileNumber: {
      type: String,
      trim: true,
      default: null,
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: null,
    },
    emergencyContactNumber: {
      type: String,
      trim: true,
      default: null,
    },
    currentAddress: {
      type: String,
      trim: true,
      default: null,
    },
    permanentAddress: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    zipCode: {
      type: String,
      trim: true,
      default: null,
    },

    // ----------------------------------------
    // 3. Relations — Sub-collections
    // ----------------------------------------

    jobInformation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobInformation",
      default: null,
    },
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      default: null,
    },
    educationDetails: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EducationDetail",
      },
    ],
    experienceDetails: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExperienceDetail",
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],

    // ----------------------------------------
    // 4. Created By (Admin ref)
    // ----------------------------------------
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    // ------------------------------------
    // 5. Auth
    // ------------------------------------

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["employee"],
      default: "employee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// -------------------------------------------
// Hash Password Before Save
// -------------------------------------------
employeeSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// ---------------------------------------------------
// Compare Password Method
// ---------------------------------------------------

employeeSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const EmployeeModel = mongoose.model("Employee", employeeSchema);
export default EmployeeModel;
