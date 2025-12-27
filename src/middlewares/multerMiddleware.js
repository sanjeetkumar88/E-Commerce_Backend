import multer from "multer";

// Use memory storage to avoid saving files on disk
const storage = multer.memoryStorage();

// General upload middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // max 5MB per file, adjust as needed
  },
  fileFilter: (req, file, cb) => {
    // Accept only images (optional)
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

export default upload;
