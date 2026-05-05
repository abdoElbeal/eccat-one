import multer from "multer";
import path from "path";

const storage = multer.memoryStorage(); /*multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile-images/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`); //unique fileName
  },
});*/

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only images are allowed "), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
export default upload;
