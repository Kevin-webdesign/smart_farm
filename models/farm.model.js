import mongoose from 'mongoose';

const farmTransactionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    cropActivity: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Income', 'Expense'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Mobile money', 'Bank'],
        required: true
    },
    description: {
        type: String
    },
     createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        }
}, {
    timestamps: true
});

export default mongoose.model('FarmTransaction', farmTransactionSchema);