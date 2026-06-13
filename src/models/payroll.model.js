import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
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
    // Salary & Bank Details
    // ─────────────────────────────────────────
    salary: {
      type: Number,
      default: null,
    },
    bankName: {
      type: String,
      trim: true,
      default: null,
    },
    accountNumber: {
      type: String,
      trim: true,
      default: null,
    },
    ifscCode: {
      type: String,
      trim: true,
      default: null,
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
  },
  { timestamps: true }
);

const PayrollModel = mongoose.model("Payroll", payrollSchema);
export default PayrollModel;
