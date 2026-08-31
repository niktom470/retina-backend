const mongoose = require('mongoose');

const screeningSchema = new mongoose.Schema(
  {
    patient: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      age: { type: Number, required: true },
      gender: { type: String, required: true },
    },
    screening: {
      date: { type: Date, default: Date.now },
      drClassIndex: { type: Number, required: true },
      drClassName: { type: String, required: true },
      confidence: { type: Number, required: true },
      probabilities: { type: [Number], required: true },
      referable: { type: Boolean, required: true },
    },
    ai: {
      modelVersion: { type: String, required: true },
      processingTime: { type: Number, required: true },
    },
    images: {
      originalPath: { type: String, required: true },
      gradCamPath: { type: String, required: true },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Screening', screeningSchema);
