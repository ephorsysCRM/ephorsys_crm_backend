import mongoose from "mongoose";
// ═════════════════════════════════════════════
//  ENUMS  (used by model + controller)
// ═════════════════════════════════════════════

export const LEAD_SOURCE = [
  "Google Ads",
  "Website",
  "Referral",
  "Direct Call",
  "Walk-In",
  "Justdial",
  "Meta Ads",
];

export const PROJECT_TYPES = [
  "website_development",
  "web_app_development",
  "mobile_app_development",
  "ui_ux_design",
  "graphic_design",
  "seo",
  "social_media_marketing",
  "paid_ads_management",
  "business_consulting",
  "it_consulting",
  "maintenance_support",
  "amc",
  "crm_development",
  "custom_software",
  "automation_service",
  "others",
];

export const LEAD_STATUS = [
  "New",          // just created, no call made yet
  "Attempted",    // call made on creation
  "Not Picked",   // call not answered → follow-up scheduled
  "Interested",   // picked up, said yes → follow-up / meeting pending
  "Meeting",      // meeting scheduled
  "Closed Won",   // converted to customer 🎉
  "Closed Lost",  // said no (Denied on connected call)
  "Rejected",     // Blocked / Wrong Number
];

export const CALL_STATUS = [
  "Connected",
  "Not Connected",
  "Switch Off / Not Reachable",
  "Blocked",
  "Wrong Number",
  "Denied",
  "Not Picked",
];

// ─────────────────────────────────────────────
//  CALL LOG  (embedded sub-document)
// ─────────────────────────────────────────────
// Every call attempt is stored here as history.
// This never gets deleted — it's an append-only log.
// ─────────────────────────────────────────────

const callLogSchema = new mongoose.Schema(
  {
    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    callStatus: {
      type: String,
      enum: CALL_STATUS,
      required: true,
    },
    remarks: { type: String, trim: true },
    callDuration: { type: Number, default: 0 },
    calledAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// ─────────────────────────────────────────────
//  FOLLOW-UP  (embedded sub-document)
// ─────────────────────────────────────────────
// Each time we schedule a follow-up, a new entry
// is pushed here. Old entries stay as history.
// ─────────────────────────────────────────────

const followUpSchema = new mongoose.Schema(
  {
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String },       // "HH:mm" format
    remarks: { type: String, trim: true },
    isCompleted: { type: Boolean, default: false },
    isMissed: { type: Boolean, default: false },
    completedAt: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { _id: true, timestamps: true },
);

// ─────────────────────────────────────────────
//  MEETING  (embedded sub-document)
// ─────────────────────────────────────────────
// Stores each meeting scheduled with the client.
// After a meeting, outcome is updated.
// ─────────────────────────────────────────────

const meetingSchema = new mongoose.Schema(
  {
    meetingDate: { type: Date, required: true },
    meetingTime: { type: String, required: true },
    type: {
      type: String,
      enum: ["Online", "Offline"],
      required: true,
    },
    address: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    remarks: { type: String, trim: true },
    outcome: {
      type: String,
      enum: ["Pending", "Closed Won", "Closed Lost", "Follow-Up Scheduled"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { _id: true, timestamps: true },
);

// ═════════════════════════════════════════════
//  LEAD  (main schema)
// ═════════════════════════════════════════════

const leadSchema = new mongoose.Schema(
  {
    // ── Basic Info ─────────────────────────────
    leadType: {
      type: String,
      default: "Customer",
      trim: true,
    },
    leadSource: {
      type: String,
      enum: LEAD_SOURCE,
      required: [true, "Lead source is required"],
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"],
    },
    projectType: {
      type: String,
      enum: PROJECT_TYPES,
    },
    remarks: { type: String, trim: true },

    // ── Assignment ────────────────────────────
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // ── Lead Pipeline Status ──────────────────
    leadStatus: {
      type: String,
      enum: LEAD_STATUS,
      default: "New",
    },

    // ── Rejection / Denial ────────────────────
    rejectedReason: {
      type: String,
      enum: ["Denied", "Blocked", "Wrong Number", null],
      default: null,
    },
    rejectedAt: { type: Date },

    // ── Not-Picked Tracking ───────────────────
    notPickedCount: { type: Number, default: 0 },
    lastNotPickedAt: { type: Date },

    // ── Next Follow-Up ────────────────────────
    nextFollowUpDate: { type: Date },
    nextFollowUpTime: { type: String },

    // ── History Arrays ────────────────────────
    callLogs: [callLogSchema],
    followUps: [followUpSchema],
    meetings: [meetingSchema],

    // ── Closing ───────────────────────────────
    isActive: { type: Boolean, default: true },
    closedAt: { type: Date },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true },
);

// ═════════════════════════════════════════════
//  INDEXES  (for fast dashboard queries)
// ═════════════════════════════════════════════

leadSchema.index({ leadStatus: 1 });
leadSchema.index({ assignedTo: 1, leadStatus: 1 });
leadSchema.index({ nextFollowUpDate: 1, isActive: 1 });
leadSchema.index({ mobileNumber: 1 }, { unique: true });

// ═════════════════════════════════════════════
//  INSTANCE METHOD: moveToRejected
// ═════════════════════════════════════════════
//
//  When to call:
//    - Call status is Blocked / Wrong Number / Denied
//    - Connected but client said NO
//
//  What it does:
//    1. Logs the call in callLogs[]
//    2. Sets leadStatus to "Rejected" (Blocked/Wrong Number)
//       or "Closed Lost" (Denied)
//    3. Marks lead as inactive
//    4. Clears nextFollowUpDate (no more follow-ups)
//    5. Saves the lead
//
// ═════════════════════════════════════════════

leadSchema.methods.moveToRejected = async function (calledBy, callStatus, remarks) {
  // Step 1: Log the call
  this.callLogs.push({
    calledBy,
    callStatus,
    remarks,
    calledAt: new Date(),
  });

  // Step 2: Set status based on reason
  //   - "Denied" means client said NO → Closed Lost
  //   - "Blocked" / "Wrong Number" → Rejected
  if (callStatus === "Denied") {
    this.leadStatus = "Closed Lost";
  } else {
    this.leadStatus = "Rejected";
  }

  // Step 3: Record rejection details
  this.rejectedReason = callStatus;
  this.rejectedAt = new Date();

  // Step 4: Deactivate — no more follow-ups
  this.isActive = false;
  this.nextFollowUpDate = null;
  this.nextFollowUpTime = null;

  // Step 5: Save
  await this.save();
};

// ═════════════════════════════════════════════
//  INSTANCE METHOD: moveToNotPicked
// ═════════════════════════════════════════════
//
//  When to call:
//    - Call status is Not Connected / Switch Off / Not Picked
//
//  What it does:
//    1. Logs the call in callLogs[]
//    2. Marks the previous follow-up as completed (if any)
//    3. Creates a NEW follow-up with the given date
//    4. Sets leadStatus to "Not Picked"
//    5. Updates nextFollowUpDate
//    6. Increments notPickedCount
//    7. Saves the lead
//
// ═════════════════════════════════════════════

leadSchema.methods.moveToNotPicked = async function (
  followUpDate,
  followUpTime,
  calledBy,
  callStatus,
  remarks,
) {
  // Step 1: Log the call
  this.callLogs.push({
    calledBy,
    callStatus,
    remarks,
    calledAt: new Date(),
  });

  // Step 2: Mark previous follow-up as completed (if any exist)
  const lastFollowUp = this.followUps[this.followUps.length - 1];
  if (lastFollowUp && !lastFollowUp.isCompleted) {
    lastFollowUp.isCompleted = true;
    lastFollowUp.completedAt = new Date();
  }

  // Step 3: Create new follow-up
  this.followUps.push({
    scheduledDate: followUpDate,
    scheduledTime: followUpTime,
    remarks: remarks || "Not picked — retry scheduled",
    createdBy: calledBy,
  });

  // Step 4: Update lead fields
  this.leadStatus = "Not Picked";
  this.nextFollowUpDate = followUpDate;
  this.nextFollowUpTime = followUpTime;
  this.notPickedCount += 1;
  this.lastNotPickedAt = new Date();

  // Step 5: Save
  await this.save();
};

// ═════════════════════════════════════════════
//  INSTANCE METHOD: moveToInterested
// ═════════════════════════════════════════════
//
//  When to call:
//    - Call connected AND client said YES
//
//  What it does:
//    1. Logs the call as "Connected" in callLogs[]
//    2. Marks the previous follow-up as completed (if any)
//    3. Creates a NEW follow-up with the next date
//    4. Sets leadStatus to "Interested"
//    5. Updates projectType if provided
//    6. Saves the lead
//
// ═════════════════════════════════════════════

leadSchema.methods.moveToInterested = async function ({
  calledBy,
  remarks,
  projectType,
  nextFollowUpDate,
  nextFollowUpTime,
}) {
  // Step 1: Log the call as Connected
  this.callLogs.push({
    calledBy,
    callStatus: "Connected",
    remarks,
    calledAt: new Date(),
  });

  // Step 2: Mark previous follow-up as completed (if any)
  const lastFollowUp = this.followUps[this.followUps.length - 1];
  if (lastFollowUp && !lastFollowUp.isCompleted) {
    lastFollowUp.isCompleted = true;
    lastFollowUp.completedAt = new Date();
  }

  // Step 3: Create new follow-up
  this.followUps.push({
    scheduledDate: nextFollowUpDate,
    scheduledTime: nextFollowUpTime,
    remarks: remarks || "Client interested — follow-up scheduled",
    createdBy: calledBy,
  });

  // Step 4: Update lead fields
  this.leadStatus = "Interested";
  this.nextFollowUpDate = nextFollowUpDate;
  this.nextFollowUpTime = nextFollowUpTime;

  // Step 5: Update project type if provided
  if (projectType) {
    this.projectType = projectType;
  }

  // Step 6: Save
  await this.save();
};

// ═════════════════════════════════════════════
//  STATIC METHOD: markMissedFollowUps
// ═════════════════════════════════════════════
//
//  Called by:
//    - The cron scheduler (every day at midnight)
//    - The dashboard endpoint (before computing stats)
//
//  Logic:
//    - Find all ACTIVE leads where nextFollowUpDate < today
//    - For each, mark the latest follow-up as isMissed = true
//
// ═════════════════════════════════════════════

leadSchema.statics.markMissedFollowUps = async function () {
  // "Start of today" = midnight today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Find leads with overdue follow-ups that are still active
  const overdue = await this.find({
    nextFollowUpDate: { $lt: startOfToday },
    isActive: true,
    leadStatus: { $in: ["Not Picked", "Interested", "Meeting"] },
  });

  let markedCount = 0;

  for (const lead of overdue) {
    // Find the latest follow-up that isn't completed
    const lastFollowUp = lead.followUps[lead.followUps.length - 1];

    if (lastFollowUp && !lastFollowUp.isCompleted && !lastFollowUp.isMissed) {
      lastFollowUp.isMissed = true;
      await lead.save();
      markedCount++;
    }
  }

  return markedCount;
};

// ═════════════════════════════════════════════
//  COMPILE & EXPORT
// ═════════════════════════════════════════════

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
