import upload from "../utils/fileUploads/multar.config.js";

/*
const multerMiddleware = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next(); // always call next
  });
};
*/

const multerMiddlewarePromise = (req, res) => {
  return new Promise((resolve, reject) => {
    upload.single("profileImage")(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};
export default multerMiddlewarePromise;
