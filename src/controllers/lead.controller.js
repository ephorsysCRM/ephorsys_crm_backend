import Lead, { CALL_STATUS } from "../models/lead.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// ─────────────────────────────────────────────
// HELPER: Get active user ID (works for both Admin and Employee)
// ─────────────────────────────────────────────
const getUserId = (req) => {
  if (req.employee) return req.employee._id;
  if (req.admin) return req.admin._id;
  throw new AppError("Unauthorized access.", 401);
};

// HELPER: Group call statuses for logic
const REJECTED_STATUSES = ["Blocked", "Wrong Number", "Denied"];
const NOT_PICKED_STATUSES = [
  "Not Connected",
  "Switch Off / Not Reachable",
  "Not Picked",
];

// ─────────────────────────────────────────────
// 1. CREATE LEAD
// ─────────────────────────────────────────────
export const createLead = asyncHandler(async (req, res) => {
  // Only employees can create leads
  if (!req.employee) {
    throw new AppError("Only employees are allowed to create leads.", 403);
  }

  const userId = req.employee._id;

  const {
    leadType, // Default "Customer"
    leadSource,
    fullName,
    mobileNumber,
    projectType,
    remarks,
    // First call fields
    initialCallStatus,
    followUpDate,
    followUpTime,
    isInterested,
  } = req.body;

  // Check if lead already exists
  const existing = await Lead.findOne({ mobileNumber });
  if (existing) {
    throw new AppError("A lead with this mobile number already exists.", 409);
  }

  // The lead is always assigned to the employee creating it.
  const finalAssignedTo = userId;

  // Build base lead
  const lead = new Lead({
    leadType: leadType || "Customer",
    leadSource,
    fullName,
    mobileNumber,
    projectType,
    remarks,
    assignedTo: finalAssignedTo,
    createdBy: userId,
    leadStatus: "New", // Default, will change if initialCallStatus is provided
  });

  // ── Route based on first call outcome ──────
  if (initialCallStatus) {
    lead.leadStatus = "Attempted";

    if (REJECTED_STATUSES.includes(initialCallStatus)) {
      // ① Rejected List immediately
      await lead.moveToRejected(userId, initialCallStatus, remarks);

    } else if (NOT_PICKED_STATUSES.includes(initialCallStatus)) {
      // ② Not Picked List + Follow Up
      if (!followUpDate) {
        throw new AppError("followUpDate is required when the call is not picked.", 400);
      }
      await lead.moveToNotPicked(
        new Date(followUpDate),
        followUpTime,
        userId,
        initialCallStatus,
        remarks,
      );

    } else if (initialCallStatus === "Connected") {
      // ③ Connected: branch on interest
      if (!isInterested) {
        // Client said NO
        await lead.moveToRejected(userId, "Denied", remarks);
      } else {
        // Client said YES
        if (!followUpDate) {
          throw new AppError("followUpDate is required for interested leads.", 400);
        }
        await lead.moveToInterested({
          calledBy: userId,
          remarks,
          projectType,
          nextFollowUpDate: new Date(followUpDate),
          nextFollowUpTime: followUpTime,
        });
      }
    } else {
      // Invalid status provided
      throw new AppError("Invalid initialCallStatus provided.", 400);
    }
  } else {
    // No call status provided, just save as New
    await lead.save();
  }

  const populated = await Lead.findById(lead._id)
    .populate("assignedTo", "firstName lastName officialEmail")
    .populate("createdBy", "firstName lastName officialEmail");

  res.status(201).json({
    success: true,
    message: "Lead created successfully.",
    data: populated,
  });
});

// ─────────────────────────────────────────────
// 2. UPDATE CALL STATUS (Subsequent Calls)
// ─────────────────────────────────────────────
export const updateCallStatus = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const {
    callStatus,
    followUpDate,
    followUpTime,
    remarks,
    isInterested,
    projectType,
  } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) throw new AppError("Lead not found.", 404);

  // Authorization check for employees
  if (req.employee && lead.assignedTo.toString() !== userId.toString()) {
    throw new AppError("Access denied. This lead is not assigned to you.", 403);
  }

  // Prevent editing closed / rejected leads
  if (["Closed Won", "Closed Lost", "Rejected"].includes(lead.leadStatus)) {
    throw new AppError(
      `Lead is already ${lead.leadStatus}. No further updates allowed.`,
      400,
    );
  }

  // ── ROUTING LOGIC ──────────────────────────

  if (REJECTED_STATUSES.includes(callStatus)) {
    // ① Denied / Blocked / Wrong Number → REJECTED LIST
    await lead.moveToRejected(userId, callStatus, remarks);

  } else if (NOT_PICKED_STATUSES.includes(callStatus)) {
    // ② Not answered → NOT PICKED LIST
    if (!followUpDate) {
      throw new AppError("followUpDate is required when call is not picked.", 400);
    }
    await lead.moveToNotPicked(
      new Date(followUpDate),
      followUpTime,
      userId,
      callStatus,
      remarks,
    );

  } else if (callStatus === "Connected") {
    // ③ Connected
    if (!isInterested) {
      // Said NO → Closed Lost → Rejected List
      await lead.moveToRejected(userId, "Denied", remarks);
    } else {
      // Said YES → INTERESTED LIST
      if (!followUpDate) {
        throw new AppError("followUpDate is required for interested leads.", 400);
      }
      await lead.moveToInterested({
        calledBy: userId,
        remarks,
        projectType,
        nextFollowUpDate: new Date(followUpDate),
        nextFollowUpTime: followUpTime,
      });
    }
  } else {
    throw new AppError("Invalid callStatus provided.", 400);
  }

  res.status(200).json({
    success: true,
    message: "Call status updated successfully.",
    data: {
      leadId: lead._id,
      leadStatus: lead.leadStatus,
      nextFollowUpDate: lead.nextFollowUpDate,
      rejectedReason: lead.rejectedReason || undefined,
    },
  });
});

// ─────────────────────────────────────────────
// 3. SCHEDULE MEETING
// ─────────────────────────────────────────────
export const scheduleMeeting = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { meetingDate, meetingTime, type, address, meetingLink, remarks } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) throw new AppError("Lead not found.", 404);

  // Authorization check
  if (req.employee && lead.assignedTo.toString() !== userId.toString()) {
    throw new AppError("Access denied.", 403);
  }

  if (!["Interested", "Not Picked", "New", "Attempted"].includes(lead.leadStatus)) {
    throw new AppError(
      `Meeting cannot be scheduled for a lead in ${lead.leadStatus} status.`,
      400,
    );
  }

  if (type === "Offline" && !address) {
    throw new AppError("Address is required for offline meetings.", 400);
  }
  if (type === "Online" && !meetingLink) {
    throw new AppError("Meeting link is required for online meetings.", 400);
  }

  lead.meetings.push({
    meetingDate: new Date(meetingDate),
    meetingTime,
    type,
    address,
    meetingLink,
    remarks,
    createdBy: userId,
  });

  lead.leadStatus = "Meeting";
  lead.nextFollowUpDate = new Date(meetingDate); // treat meeting as next touchpoint
  await lead.save();

  res.status(200).json({
    success: true,
    message: "Meeting scheduled.",
    data: lead.meetings[lead.meetings.length - 1],
  });
});

// ─────────────────────────────────────────────
// 4. CLOSE LEAD
// ─────────────────────────────────────────────
export const closeLead = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { outcome, remarks } = req.body;

  if (!["Closed Won", "Closed Lost"].includes(outcome)) {
    throw new AppError('outcome must be "Closed Won" or "Closed Lost".', 400);
  }

  const lead = await Lead.findById(id);
  if (!lead) throw new AppError("Lead not found.", 404);

  // Authorization check
  if (req.employee && lead.assignedTo.toString() !== userId.toString()) {
    throw new AppError("Access denied.", 403);
  }

  lead.leadStatus = outcome;
  lead.closedAt = new Date();
  lead.closedBy = userId;
  lead.isActive = false;
  lead.nextFollowUpDate = null;

  if (outcome === "Closed Lost") {
    lead.rejectedReason = "Denied";
    lead.rejectedAt = new Date();
  }

  if (remarks) lead.remarks = remarks;

  // Mark current meeting outcome if any
  const lastMeeting = lead.meetings[lead.meetings.length - 1];
  if (lastMeeting && lastMeeting.outcome === "Pending") {
    lastMeeting.outcome = outcome;
  }

  // Mark last followup completed
  const lastFollowUp = lead.followUps[lead.followUps.length - 1];
  if (lastFollowUp && !lastFollowUp.isCompleted) {
     lastFollowUp.isCompleted = true;
     lastFollowUp.completedAt = new Date();
  }

  await lead.save();

  res.status(200).json({
    success: true,
    message: `Lead marked as ${outcome}.`,
    data: { leadId: lead._id, leadStatus: lead.leadStatus },
  });
});

// ─────────────────────────────────────────────
// 5. GET LEADS BY LIST TYPE
// ─────────────────────────────────────────────
export const getLeads = asyncHandler(async (req, res) => {
  const { list = "all", page = 1, limit = 20 } = req.query;

  const filter = {};

  // Role-based scope
  if (req.employee) {
    filter.assignedTo = req.employee._id;
  }

  // List-based filter
  switch (list) {
    case "interested":
      filter.leadStatus = "Interested";
      break;
    case "notPicked":
      filter.leadStatus = "Not Picked";
      break;
    case "rejected":
      filter.leadStatus = { $in: ["Closed Lost", "Rejected"] };
      break;
    case "meeting":
      filter.leadStatus = "Meeting";
      break;
    case "closedWon":
      filter.leadStatus = "Closed Won";
      break;
    case "missed":
      // Follow-up date passed and not completed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.nextFollowUpDate = { $lt: today };
      filter.leadStatus = { $in: ["Not Picked", "Interested", "Meeting"] };
      filter.isActive = true;
      break;
    case "todayAttempted":
      const startOfDay1 = new Date(); startOfDay1.setHours(0, 0, 0, 0);
      const endOfDay1 = new Date(); endOfDay1.setHours(23, 59, 59, 999);
      filter["callLogs.calledAt"] = { $gte: startOfDay1, $lte: endOfDay1 };
      break;
    case "todayFollowUps":
      const startOfDay2 = new Date(); startOfDay2.setHours(0, 0, 0, 0);
      const endOfDay2 = new Date(); endOfDay2.setHours(23, 59, 59, 999);
      filter.nextFollowUpDate = { $gte: startOfDay2, $lte: endOfDay2 };
      filter.leadStatus = { $in: ["Not Picked", "Interested"] };
      break;
    case "all":
    default:
      break; // no extra filter
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("assignedTo", "firstName lastName officialEmail")
      .populate("createdBy", "firstName lastName officialEmail")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: leads,
  });
});

// ─────────────────────────────────────────────
// 6. DASHBOARD STATS
// ─────────────────────────────────────────────
export const getDashboardStats = asyncHandler(async (req, res) => {
  // Auto-mark missed follow-ups before computing stats
  await Lead.markMissedFollowUps();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const scope = req.employee ? { assignedTo: req.employee._id } : {};

  const [
    totalLeads,
    todayAttempted,
    todayFollowUps,
    todayMeetings,
    missedFollowUps,
    interestedCount,
    notPickedCount,
    rejectedCount,
    closedWonCount,
  ] = await Promise.all([
    Lead.countDocuments({ ...scope }),

    // Today's call attempts (any lead where a call was logged today)
    Lead.countDocuments({
      ...scope,
      "callLogs.calledAt": { $gte: startOfToday, $lte: endOfToday },
    }),

    // Follow-ups scheduled for today
    Lead.countDocuments({
      ...scope,
      nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
      leadStatus: { $in: ["Not Picked", "Interested"] },
    }),

    // Meetings scheduled for today
    Lead.countDocuments({
      ...scope,
      "meetings.meetingDate": { $gte: startOfToday, $lte: endOfToday },
      leadStatus: "Meeting",
    }),

    // Missed: follow-up date < today, still active
    Lead.countDocuments({
      ...scope,
      nextFollowUpDate: { $lt: startOfToday },
      leadStatus: { $in: ["Not Picked", "Interested", "Meeting"] },
      isActive: true,
    }),

    Lead.countDocuments({ ...scope, leadStatus: "Interested" }),
    Lead.countDocuments({ ...scope, leadStatus: "Not Picked" }),
    Lead.countDocuments({
      ...scope,
      leadStatus: { $in: ["Closed Lost", "Rejected"] },
    }),
    Lead.countDocuments({ ...scope, leadStatus: "Closed Won" }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalLeads,
      todayAttempted,
      todayFollowUps,
      todayMeetings,
      missedFollowUps,
      pipeline: {
        interested: interestedCount,
        notPicked: notPickedCount,
        rejected: rejectedCount,
        closedWon: closedWonCount,
      },
    },
  });
});

// ─────────────────────────────────────────────
// 7. GET SINGLE LEAD
// ─────────────────────────────────────────────
export const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate("assignedTo", "firstName lastName officialEmail role")
    .populate("createdBy", "firstName lastName officialEmail")
    .populate("callLogs.calledBy", "firstName lastName")
    .populate("followUps.createdBy", "firstName lastName")
    .populate("meetings.createdBy", "firstName lastName");

  if (!lead) throw new AppError("Lead not found.", 404);

  // Employee can only view their own leads
  if (
    req.employee &&
    lead.assignedTo._id.toString() !== req.employee._id.toString()
  ) {
    throw new AppError("Access denied.", 403);
  }

  res.status(200).json({ success: true, data: lead });
});

// ─────────────────────────────────────────────
// 8. GET EMPLOYEE PERFORMANCE (Admin Only)
// ─────────────────────────────────────────────
export const getEmployeePerformance = asyncHandler(async (req, res) => {
  // Only Admin can view specific employee performance
  if (!req.admin) {
    throw new AppError("Access denied. Admin only.", 403);
  }

  const { employeeId } = req.params;

  // Auto-mark missed follow-ups
  await Lead.markMissedFollowUps();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const scope = { assignedTo: employeeId };

  const [
    totalLeads,
    todayAttempted,
    todayFollowUps,
    todayMeetings,
    missedFollowUps,
    interestedCount,
    notPickedCount,
    rejectedCount,
    closedWonCount,
    recentLeads // Fetch some recent leads for the employee
  ] = await Promise.all([
    Lead.countDocuments(scope),

    Lead.countDocuments({
      ...scope,
      "callLogs.calledAt": { $gte: startOfToday, $lte: endOfToday },
    }),

    Lead.countDocuments({
      ...scope,
      nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
      leadStatus: { $in: ["Not Picked", "Interested"] },
    }),

    Lead.countDocuments({
      ...scope,
      "meetings.meetingDate": { $gte: startOfToday, $lte: endOfToday },
      leadStatus: "Meeting",
    }),

    Lead.countDocuments({
      ...scope,
      nextFollowUpDate: { $lt: startOfToday },
      leadStatus: { $in: ["Not Picked", "Interested", "Meeting"] },
      isActive: true,
    }),

    Lead.countDocuments({ ...scope, leadStatus: "Interested" }),
    Lead.countDocuments({ ...scope, leadStatus: "Not Picked" }),
    Lead.countDocuments({
      ...scope,
      leadStatus: { $in: ["Closed Lost", "Rejected"] },
    }),
    Lead.countDocuments({ ...scope, leadStatus: "Closed Won" }),
    
    Lead.find(scope).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalLeads,
        todayAttempted,
        todayFollowUps,
        todayMeetings,
        missedFollowUps,
        pipeline: {
          interested: interestedCount,
          notPicked: notPickedCount,
          rejected: rejectedCount,
          closedWon: closedWonCount,
        },
      },
      recentLeads
    },
  });
});

// ─────────────────────────────────────────────
// 9. GET HOTLIST (Prioritized Prospects)
// ─────────────────────────────────────────────
export const getHotlist = asyncHandler(async (req, res) => {
  const scope = {};
  if (req.employee) {
    scope.assignedTo = req.employee._id;
  }

  // Hotlist consists of highly qualified leads (Interested or Meeting scheduled)
  // Sorted by the closest follow-up date (most urgent first)
  const hotLeads = await Lead.find({
    ...scope,
    leadStatus: { $in: ["Interested", "Meeting"] },
    isActive: true,
  })
    .populate("assignedTo", "firstName lastName officialEmail")
    .populate("createdBy", "firstName lastName officialEmail")
    .sort({ nextFollowUpDate: 1 }) // Ascending: nearest dates first
    .lean();

  res.status(200).json({
    success: true,
    count: hotLeads.length,
    message: "Hotlist retrieved successfully.",
    data: hotLeads,
  });
});

// ─────────────────────────────────────────────
// 10. GET PIPELINE VIEW (Kanban / Board View)
// ─────────────────────────────────────────────
export const getPipeline = asyncHandler(async (req, res) => {
  const scope = {};
  if (req.employee) {
    scope.assignedTo = req.employee._id;
  }

  // Fetch all leads for this user (or all if admin)
  const allLeads = await Lead.find(scope)
    .populate("assignedTo", "firstName lastName")
    .sort({ nextFollowUpDate: 1 }) // Important leads on top
    .lean();

  // Group leads into pipeline stages
  const pipelineStages = {
    "New": [],
    "Attempted": [],
    "Not Picked": [],
    "Interested": [],
    "Meeting": [],
    "Closed Won": [],
    "Closed Lost": [],
    "Rejected": []
  };

  allLeads.forEach(lead => {
    if (pipelineStages[lead.leadStatus]) {
      pipelineStages[lead.leadStatus].push(lead);
    }
  });

  res.status(200).json({
    success: true,
    message: "Pipeline view retrieved successfully.",
    data: pipelineStages,
  });
});