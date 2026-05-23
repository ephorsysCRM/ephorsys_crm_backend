import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin Name is Required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Admin Email is Required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
  },
  { timestamps: true },
);

// Hash Password Before Save
adminSchema.pre("save", async function () {
  // Prevent re-hashing
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare Password Method
adminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const AdminModel = mongoose.model("Admin", adminSchema);
export default AdminModel;
