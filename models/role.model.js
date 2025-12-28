import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: String,
    required: true
  }],
  userCount: {
    type: Number,
    default: 0
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
roleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Role = mongoose.model('Role', roleSchema);

export default Role;