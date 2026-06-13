import mongoose from "mongoose";
import EmployeeModel from "../models/employee.model.js";
import JobInformationModel from "../models/jobInformation.model.js";
import PayrollModel from "../models/payroll.model.js";
import EducationDetailModel from "../models/educationDetail.model.js";
import ExperienceDetailModel from "../models/experienceDetail.model.js";
import DocumentModel from "../models/document.model.js";
import generateToken from "../utils/generateToken.js";
import {
  validateFileSizes,
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../middleware/upload.middleware.js";

// --------------------------------------------------------------
// Constants
// --------------------------------------------------------------

const PDF_MIME = "application/pdf";

// Image-type document field names (uploaded to Cloudinary)
const IMAGE_DOC_FIELDS = ["passportPhoto"];

// Fields that go into the Document collection (not profilePhoto)
const DOC_FIELD_NAMES = [
  "aadhaarCard",
  "panCard",
  "resume",
  "offerLetter",
  "experienceLetter",
  "educationCertificates",
  "signedNDA",
  "otherDocuments",
];

// --------------------------------------------------------------
// Helper — populate all sub-collections on an Employee query
// --------------------------------------------------------------

const populateEmployee = (query) => {
  return query
    .select("-password")
    .populate("createdBy", "name email")
    .populate("jobInformation")
    .populate("payroll")
    .populate("educationDetails")
    .populate("experienceDetails")
    .populate({
      path: "documents",
      select: "-fileData", // exclude raw binary from list responses
    });
};

// --------------------------------------------------------------
// @description  -  Register Employee  (Admin Only)
// @route        -  POST /api/v1/employee/register
// @access       -  Private (Admin)
// Expects       -  multipart/form-data  (text fields + file uploads together)
// --------------------------------------------------------------

export const registerEmployee = async (req, res) => {
  // ─── Start a Mongoose session for atomicity ───
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const files = req.files ?? {};

    // ─────────────────────────────────────────
    // 1. Per-field file size validation
    // ─────────────────────────────────────────
    const sizeErrors = validateFileSizes(files);
    if (sizeErrors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "File size limit exceeded",
        errors: sizeErrors,
      });
    }

    // ─────────────────────────────────────────
    // 2. Destructure text fields from req.body
    // ─────────────────────────────────────────
    const {
      // Personal
      employeeId,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      maritalStatus,
      bloodGroup,
      nationality,

      // Contact
      personalEmail,
      officialEmail,
      mobileNumber,
      alternateMobileNumber,
      emergencyContactName,
      emergencyContactNumber,
      currentAddress,
      permanentAddress,
      city,
      state,
      country,
      zipCode,

      // Job
      department,
      designation,
      employeeType,
      workLocation,
      joiningDate,
      probationEndDate,
      shiftTiming,
      workMode,
      employmentStatus,

      // Salary & Payroll
      salary,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,

      // Education  (sent as JSON string for multiple: '[{...}, {...}]')
      education,

      // Experience (sent as JSON string for multiple: '[{...}, {...}]')
      experience,

      // Auth
      password,
    } = req.body;

    // ─────────────────────────────────────────
    // 3. Required Field Validation
    // ─────────────────────────────────────────
    if (
      !employeeId ||
      !firstName ||
      !lastName ||
      !gender ||
      !dateOfBirth ||
      !personalEmail ||
      !officialEmail ||
      !mobileNumber ||
      !department ||
      !designation ||
      !employeeType ||
      !joiningDate ||
      !password
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
        required: [
          "employeeId",
          "firstName",
          "lastName",
          "gender",
          "dateOfBirth",
          "personalEmail",
          "officialEmail",
          "mobileNumber",
          "department",
          "designation",
          "employeeType",
          "joiningDate",
          "password",
        ],
      });
    }

    // ─────────────────────────────────────────
    // 4. Duplicate Check
    // ─────────────────────────────────────────
    const existing = await EmployeeModel.findOne({
      $or: [{ employeeId }, { officialEmail }, { personalEmail }],
    });

    if (existing) {
      let conflictField = "Record";
      if (existing.employeeId === employeeId) conflictField = "Employee ID";
      if (existing.officialEmail === officialEmail)
        conflictField = "Official Email";
      if (existing.personalEmail === personalEmail)
        conflictField = "Personal Email";

      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: `${conflictField} already exists`,
      });
    }

    const uploadedCloudinaryIds = [];

    // ─────────────────────────────────────────
    // 5. Upload profilePhoto to Cloudinary
    // ─────────────────────────────────────────
    let profilePhotoUrl = null;
    let profilePhotoCloudinaryId = null;

    if (files.profilePhoto && files.profilePhoto[0]) {
      const result = await uploadToCloudinary(
        files.profilePhoto[0].buffer,
        "employees/profile"
      );
      profilePhotoUrl = result.secure_url;
      profilePhotoCloudinaryId = result.public_id;
      uploadedCloudinaryIds.push(result.public_id);
    }

    // ─────────────────────────────────────────
    // 6. Create Employee (core document)
    // ─────────────────────────────────────────
    const employee = new EmployeeModel({
      employeeId,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      maritalStatus,
      profilePhoto: profilePhotoUrl,
      profilePhotoCloudinaryId,
      bloodGroup,
      nationality,
      personalEmail,
      officialEmail,
      mobileNumber,
      alternateMobileNumber,
      emergencyContactName,
      emergencyContactNumber,
      currentAddress,
      permanentAddress,
      city,
      state,
      country,
      zipCode,
      password,
      isActive: employmentStatus ? ["Active", "Notice Period"].includes(employmentStatus) : true,
      createdBy: req.admin._id,
    });
    await employee.save({ session });

    // ─────────────────────────────────────────
    // 7. Create Job Information
    // ─────────────────────────────────────────
    const jobInfo = new JobInformationModel({
      employee: employee._id,
      department,
      designation,
      employeeType,
      workLocation,
      joiningDate,
      probationEndDate,
      shiftTiming,
      workMode,
      employmentStatus,
    });
    await jobInfo.save({ session });

    // ─────────────────────────────────────────
    // 8. Create Payroll
    // ─────────────────────────────────────────
    const payroll = new PayrollModel({
      employee: employee._id,
      salary: salary || null,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
    });
    await payroll.save({ session });

    // ─────────────────────────────────────────
    // 9. Create Education Details (multiple)
    // ─────────────────────────────────────────
    let educationDocs = [];
    if (education) {
      let parsedEducation;
      try {
        parsedEducation =
          typeof education === "string" ? JSON.parse(education) : education;
      } catch {
        parsedEducation = [education];
      }

      if (!Array.isArray(parsedEducation)) {
        parsedEducation = [parsedEducation];
      }

      const educationRecords = parsedEducation.map((edu) => ({
        employee: employee._id,
        qualification: edu.qualification || null,
        university: edu.university || null,
        passingYear: edu.passingYear || null,
        percentage: edu.percentage || null,
        specialization: edu.specialization || null,
      }));

      educationDocs = await EducationDetailModel.create(educationRecords, {
        session,
        ordered: true,
      });
    }

    // ─────────────────────────────────────────
    // 10. Create Experience Details (multiple)
    // ─────────────────────────────────────────
    let experienceDocs = [];
    if (experience) {
      let parsedExperience;
      try {
        parsedExperience =
          typeof experience === "string"
            ? JSON.parse(experience)
            : experience;
      } catch {
        parsedExperience = [experience];
      }

      if (!Array.isArray(parsedExperience)) {
        parsedExperience = [parsedExperience];
      }

      const experienceRecords = parsedExperience.map((exp) => ({
        employee: employee._id,
        companyName: exp.companyName || null,
        designation: exp.designation || null,
        startDate: exp.startDate || null,
        endDate: exp.endDate || null,
        totalExperience: exp.totalExperience || null,
        skillsUsed: exp.skillsUsed || [],
        reasonForLeaving: exp.reasonForLeaving || null,
      }));

      experienceDocs = await ExperienceDetailModel.create(experienceRecords, {
        session,
        ordered: true,
      });
    }

    // ─────────────────────────────────────────
    // 11. Process & Store Documents
    //     PDF  → Buffer saved in MongoDB
    //     Image → Upload to Cloudinary, save URL
    // ─────────────────────────────────────────
    const documentRecords = [];

    for (const fieldName of DOC_FIELD_NAMES) {
      const fieldFiles = files[fieldName];
      if (!fieldFiles || fieldFiles.length === 0) continue;

      for (const file of fieldFiles) {
        const isPDF = file.mimetype === PDF_MIME;

        if (isPDF) {
          // Store PDF binary directly in MongoDB
          documentRecords.push({
            employee: employee._id,
            fieldName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            fileData: file.buffer,
          });
        } else {
          // Upload image to Cloudinary
          const cloudResult = await uploadToCloudinary(
            file.buffer,
            `employees/documents/${fieldName}`
          );
          documentRecords.push({
            employee: employee._id,
            fieldName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            fileUrl: cloudResult.secure_url,
            cloudinaryId: cloudResult.public_id,
          });
          uploadedCloudinaryIds.push(cloudResult.public_id);
        }
      }
    }

    // Handle passportPhoto separately (image → Cloudinary, stored in documents)
    if (files.passportPhoto && files.passportPhoto[0]) {
      const file = files.passportPhoto[0];
      const cloudResult = await uploadToCloudinary(
        file.buffer,
        "employees/documents/passportPhoto"
      );
      documentRecords.push({
        employee: employee._id,
        fieldName: "passportPhoto",
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fileUrl: cloudResult.secure_url,
        cloudinaryId: cloudResult.public_id,
      });
      uploadedCloudinaryIds.push(cloudResult.public_id);
    }

    let savedDocuments = [];
    if (documentRecords.length > 0) {
      savedDocuments = await DocumentModel.create(documentRecords, {
        session,
        ordered: true,
      });
    }

    // ─────────────────────────────────────────
    // 12. Update Employee with all refs
    // ─────────────────────────────────────────
    employee.jobInformation = jobInfo._id;
    employee.payroll = payroll._id;
    employee.educationDetails = educationDocs.map((d) => d._id);
    employee.experienceDetails = experienceDocs.map((d) => d._id);
    employee.documents = savedDocuments.map((d) => d._id);
    await employee.save({ session });

    // ─────────────────────────────────────────
    // 13. Commit Transaction
    // ─────────────────────────────────────────
    await session.commitTransaction();
    session.endSession();

    // ─────────────────────────────────────────
    // 14. Fetch fully populated response
    // ─────────────────────────────────────────
    const employeeData = await populateEmployee(
      EmployeeModel.findById(employee._id)
    );

    return res.status(201).json({
      success: true,
      message: "Employee Registered Successfully",
      data: employeeData,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Rollback uploaded files from Cloudinary
    if (typeof uploadedCloudinaryIds !== "undefined" && uploadedCloudinaryIds.length > 0) {
      for (const publicId of uploadedCloudinaryIds) {
        await deleteFromCloudinary(publicId);
      }
    }

    console.error("Register Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// @description  -  Login Employee
// @route        -  POST /api/v1/employee/login
// @access       -  Public
// --------------------------------------------------------------

export const loginEmployee = async (req, res) => {
  try {
    const { officialEmail, password } = req.body;

    // ─────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────
    if (!officialEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Official Email and Password are Required",
      });
    }

    // ─────────────────────────────────────────
    // Find Employee
    // ─────────────────────────────────────────
    const employee = await EmployeeModel.findOne({ officialEmail });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    // ─────────────────────────────────────────
    // Active Account Check
    // ─────────────────────────────────────────
    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact Admin.",
      });
    }

    // ─────────────────────────────────────────
    // Password Check
    // ─────────────────────────────────────────
    const isPasswordMatched = await employee.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    // ─────────────────────────────────────────
    // Generate Token & Set Cookie
    // ─────────────────────────────────────────
    const token = generateToken(employee._id);

    const cookieOption = {
      httpOnly: true,
      secure: true, // set true in production
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("token", token, cookieOption);

    // ─────────────────────────────────────────
    // Fetch basic job info for login response
    // ─────────────────────────────────────────
    const jobInfo = await JobInformationModel.findOne({
      employee: employee._id,
    });

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      data: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        officialEmail: employee.officialEmail,
        profilePhoto: employee.profilePhoto,
        department: jobInfo?.department || null,
        designation: jobInfo?.designation || null,
        employmentStatus: jobInfo?.employmentStatus || null,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error("Login Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// @description  -  Logout Employee
// @route        -  POST /api/v1/employee/logout
// @access       -  Private (Employee)
// --------------------------------------------------------------

export const logoutEmployee = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    return res.status(200).json({
      success: true,
      message: "Logout Successful",
    });
  } catch (error) {
    console.error("Logout Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// @description  -  Get Own Profile
// @route        -  GET /api/v1/employee/profile
// @access       -  Private (Employee)
// --------------------------------------------------------------

export const getEmployeeProfile = async (req, res) => {
  try {
    const employee = await populateEmployee(
      EmployeeModel.findById(req.employee._id)
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Get Employee Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @description  -  Get Single Employee by ID
// @route        -  GET /api/v1/employee/:id
// @access       -  Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await populateEmployee(
      EmployeeModel.findById(req.params.id)
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Get Employee By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @description  -  Update Employee Field
// @route        -  PATCH /api/v1/employee/:id
// @access       -  Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { root, jobInformation, payroll, educationDetails, experienceDetails } = req.body;

    const employee = await EmployeeModel.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (root) {
      await EmployeeModel.findByIdAndUpdate(id, { $set: root }, { new: true });
    }

    if (jobInformation) {
      if (employee.jobInformation) {
        await JobInformationModel.findByIdAndUpdate(employee.jobInformation, { $set: jobInformation });
      } else {
        const newJob = await JobInformationModel.create({ ...jobInformation, employee: id });
        employee.jobInformation = newJob._id;
        await employee.save();
      }

      // Sync isActive status based on employmentStatus
      if (jobInformation.employmentStatus) {
        const activeStatuses = ["Active", "Notice Period"];
        employee.isActive = activeStatuses.includes(jobInformation.employmentStatus);
        await employee.save();
      }
    }

    if (payroll) {
      if (employee.payroll) {
        await PayrollModel.findByIdAndUpdate(employee.payroll, { $set: payroll });
      } else {
        const newPayroll = await PayrollModel.create({ ...payroll, employee: id });
        employee.payroll = newPayroll._id;
        await employee.save();
      }
    }

    if (educationDetails) {
      if (employee.educationDetails && employee.educationDetails.length > 0) {
        await EducationDetailModel.findByIdAndUpdate(employee.educationDetails[0], { $set: educationDetails });
      } else {
        const newEdu = await EducationDetailModel.create({ ...educationDetails, employee: id });
        employee.educationDetails = [newEdu._id];
        await employee.save();
      }
    }

    if (experienceDetails) {
      if (employee.experienceDetails && employee.experienceDetails.length > 0) {
        await ExperienceDetailModel.findByIdAndUpdate(employee.experienceDetails[0], { $set: experienceDetails });
      } else {
        const newExp = await ExperienceDetailModel.create({ ...experienceDetails, employee: id });
        employee.experienceDetails = [newExp._id];
        await employee.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully"
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @description  -  Get All Employees  (with optional filters)
// @route        -  GET /api/v1/employee/all
// @access       -  Private (Admin)
// Query params  -  ?department=&employmentStatus=&employeeType=&workMode=
//
// Filters apply to JobInformation fields. We use aggregation to
// look up the sub-collection and filter on its fields.
// ─────────────────────────────────────────────────────────────────────────────

export const getAllEmployees = async (req, res) => {
  try {
    const { department, employmentStatus, employeeType, workMode } = req.query;

    // Build a match condition for JobInformation fields
    const jobFilter = {};
    if (department) jobFilter["jobInformation.department"] = department;
    if (employmentStatus)
      jobFilter["jobInformation.employmentStatus"] = employmentStatus;
    if (employeeType) jobFilter["jobInformation.employeeType"] = employeeType;
    if (workMode) jobFilter["jobInformation.workMode"] = workMode;

    const hasJobFilter = Object.keys(jobFilter).length > 0;

    // If no filters, use simple populate
    if (!hasJobFilter) {
      const employees = await populateEmployee(
        EmployeeModel.find().sort({ createdAt: -1 })
      );

      return res.status(200).json({
        success: true,
        total: employees.length,
        data: employees,
      });
    }

    // With filters, use aggregation pipeline
    const pipeline = [
      // Lookup JobInformation
      {
        $lookup: {
          from: "jobinformations",
          localField: "jobInformation",
          foreignField: "_id",
          as: "jobInformation",
        },
      },
      { $unwind: { path: "$jobInformation", preserveNullAndEmptyArrays: false } },

      // Apply filters
      { $match: jobFilter },

      // Remove password
      { $project: { password: 0 } },

      // Sort
      { $sort: { createdAt: -1 } },

      // Lookup Payroll
      {
        $lookup: {
          from: "payrolls",
          localField: "payroll",
          foreignField: "_id",
          as: "payroll",
        },
      },
      {
        $unwind: { path: "$payroll", preserveNullAndEmptyArrays: true },
      },

      // Lookup Education
      {
        $lookup: {
          from: "educationdetails",
          localField: "educationDetails",
          foreignField: "_id",
          as: "educationDetails",
        },
      },

      // Lookup Experience
      {
        $lookup: {
          from: "experiencedetails",
          localField: "experienceDetails",
          foreignField: "_id",
          as: "experienceDetails",
        },
      },

      // Lookup Documents (exclude fileData)
      {
        $lookup: {
          from: "documents",
          localField: "documents",
          foreignField: "_id",
          as: "documents",
          pipeline: [{ $project: { fileData: 0 } }],
        },
      },

      // Lookup createdBy
      {
        $lookup: {
          from: "admins",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      {
        $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true },
      },
    ];

    const employees = await EmployeeModel.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      total: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Get All Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @description  -  Get Document File (PDF stream or Image redirect)
// @route        -  GET /api/v1/employee/document/:id
// @access       -  Private (Admin or Employee)
// ─────────────────────────────────────────────────────────────────────────────
export const getDocumentFile = async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document Not Found",
      });
    }

    // Authorization: Employees can only view their own documents; Admins can view any
    if (req.employee && req.employee._id.toString() !== document.employee.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You can only access your own documents",
      });
    }

    // If image stored in Cloudinary
    if (document.fileUrl) {
      return res.redirect(document.fileUrl);
    }

    // If PDF stored as Buffer in MongoDB
    if (document.fileData) {
      res.setHeader("Content-Type", document.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${document.originalName}"`
      );
      return res.send(document.fileData);
    }

    return res.status(404).json({
      success: false,
      message: "Document file content is empty",
    });
  } catch (error) {
    console.error("Get Document File Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};