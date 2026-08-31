const Screening = require('../models/Screening');
const Notification = require('../models/Notification');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

/**
 * POST /api/screenings
 * Saves the patient data, AI results, and references to stored images.
 */
const createScreening = async (req, res, next) => {
  try {
    // Multipart form fields are received as strings; parse them as JSON
    const parseField = (field) => {
      if (!field) return null;
      if (typeof field === 'object') return field;
      try {
        return JSON.parse(field);
      } catch (e) {
        return null;
      }
    };

    const patient = parseField(req.body.patient);
    const screening = parseField(req.body.screening);
    const ai = parseField(req.body.ai);
    const heatmap_base64 = req.body.heatmap_base64;

    if (!patient || !screening || !ai || !heatmap_base64) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient, screening, ai, or heatmap_base64.',
      });
    }

    // 1. Handle Original Image (saved by multer diskStorage)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Original fundus image is required.',
      });
    }
    const originalPath = req.file.path;

    // 2. Handle Grad-CAM Image (save base64 to disk)
    const gradCamFileName = `gradcam-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const gradCamPath = path.join('uploads', gradCamFileName);

    // Strip base64 header if present
    const base64Data = heatmap_base64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    fs.writeFileSync(gradCamPath, imageBuffer);

    // 3. Create MongoDB Document
    const screeningDoc = await Screening.create({
      patient,
      screening,
      ai,
      images: {
        originalPath,
        gradCamPath,
      },
      createdBy: req.userId,
    });

    // ─── Notification Triggers ───────────────────────────────────────────────────
    try {
      const technicians = await User.find({ role: 'technician' });
      const clinicians = await User.find({ role: 'clinician' });

      const notifications = [];

      // Notify Technicians
      technicians.forEach((tech) => {
        notifications.push({
          userId: tech._id,
          title: 'Screening Processed',
          description: 'A new screening record has been successfully saved.',
          type: 'SCREENING_PROCESSED',
          screeningId: screeningDoc._id,
        });
      });

      // Notify Clinicians
      const isReferable = screening.referable === true || screening.referable === 'true';
      clinicians.forEach((clinician) => {
        notifications.push({
          userId: clinician._id,
          title: 'Review Required',
          description: isReferable
            ? `Urgent: A referable screening for ${patient.name} requires clinical review.`
            : `A new screening for ${patient.name} is available for review.`,
          type: 'REVIEW_REQUIRED',
          screeningId: screeningDoc._id,
        });
      });

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notificationError) {
      console.error('Notification Trigger Error:', notificationError);
      // We don't call next(notificationError) here to avoid failing the request
      // if only notifications fail.
    }
    // ──────────────────────────────────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      message: 'Screening record saved successfully',
      data: screeningDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/screenings
 * Returns all screenings for the authenticated user (or all if admin).
 */
const getAllScreenings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.userRole !== 'admin') {
      filter.createdBy = req.userId;
    }

    const screenings = await Screening.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: screenings.length,
      data: screenings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/screenings/:id
 * Returns a single screening by ID.
 */
const getScreeningById = async (req, res, next) => {
  try {
    const screening = await Screening.findById(req.params.id);

    if (!screening) {
      return res.status(404).json({
        success: false,
        message: 'Screening record not found.',
      });
    }

    // Access Control: Only admins or the creator can view the screening
    if (req.userRole !== 'admin' && screening.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to view this screening.',
      });
    }

    res.status(200).json({
      success: true,
      data: screening,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createScreening, getAllScreenings, getScreeningById };
