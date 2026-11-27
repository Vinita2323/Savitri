import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: 'Administrator',
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'super_admin'],
      default: 'admin',
    },
    // Account state enforced on every authenticated request (documents created before this
    // field existed have no value and are treated as 'active').
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    // Incremented to revoke every previously issued token for this account
    // (password change, forced logout). Tokens without the claim are treated as version 0.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // Optional brand restriction for role 'admin'. Unset/empty or '*' = all brands.
    authorizedBrands: {
      type: [String],
      default: undefined,
    },

    // 'ASSIGNED' = managed in Admin Configuration: only the listed brands, and an empty list means no brand (never "all").
    brandAccess: { type: String, enum: ['ASSIGNED'], default: undefined },
    // The brands this admin holds exclusively (not shared). A unique index stops two admins taking the same brand at once.
    exclusiveBrands: { type: [String], default: undefined },

    // ── City Admin (an admin tied to exactly ONE brand / city). Unset on every other admin account. ──
    adminType: { type: String, enum: ['CITY_ADMIN'], default: undefined },
    brandId: { type: String, trim: true, default: undefined },
    city: { type: String, trim: true, default: undefined }, // city of the brand at assignment time (validated against the Brand record)
    cityId: { type: String, trim: true, default: undefined }, // normalised city key of the brand
    username: { type: String, trim: true, lowercase: true, default: undefined },
    permissions: { type: [String], default: undefined }, // areas of the panel this City Admin may use; enforced on the server
    mustChangePassword: { type: Boolean, default: undefined },
    lastLoginAt: { type: Date, default: undefined },
    assignedBy: { id: { type: mongoose.Schema.Types.ObjectId, default: undefined }, name: { type: String, default: undefined } },
    assignmentHistory: { type: [{ at: { type: Date, default: Date.now }, action: String, by: String, note: String }], default: undefined },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password method
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// One ACTIVE City Admin per brand; usernames are unique when present (autoIndex is off: see ensureCityAdminIndexes)
adminSchema.index({ brandId: 1 }, { unique: true, partialFilterExpression: { adminType: 'CITY_ADMIN', status: 'active' } });
adminSchema.index({ username: 1 }, { unique: true, sparse: true });
adminSchema.index({ exclusiveBrands: 1 }, { unique: true, partialFilterExpression: { 'exclusiveBrands.0': { $exists: true } } });

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
