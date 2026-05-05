import User from "../models/User.js";
import RegistrationCode from "../models/RegistrationCode.js";
import Password from "../utils/auth/Password.js";
import emailService from "../servcies/emails/sendEmails.js";
import Misc from "../utils/Misc.js";
import jwtUtils from "../utils/auth/jwt.js";
import multerMiddlewarePromise from "../middlewares/multar.middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { randomUUID } from "crypto";
// sign up
async function SignUp(req, res) {
  console.log("===> DEBUG: SignUp Request Entered");

  try {
    // 1️⃣ Run multer (memory)
    await multerMiddlewarePromise(req, res);

    console.log("req.body exists:", !!req.body);
    console.log("req.file exists:", !!req.file);

    if (!req.file) {
      return res.status(400).json({ message: "Profile Image is Required" });
    }

    // Extract body fields
    const {
      fullName,
      nationalId,
      registrationCode,
      email,
      password,
      passwordConfirm,
      nickName,
    } = req.body;

    // Ensure all fields are provided
    if (
      !fullName ||
      !nationalId ||
      !registrationCode ||
      !email ||
      !password ||
      !passwordConfirm ||
      !nickName
    ) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    // 1️⃣ Validate registration code
    console.log("Step 1: Checking registration code...");
    const isCodeExsit = await RegistrationCode.findOne({
      code: registrationCode,
      nationalId,
    });

    if (!isCodeExsit) {
      return res.status(400).json({ message: "Invalid registration code" });
    }
    if (isCodeExsit.isUsed) {
      return res
        .status(400)
        .json({ message: "Registration code already used" });
    }
    if (isCodeExsit.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Registration code expired" });
    }

    // 2️⃣ Check uniqueness
    console.log("Step 2: Checking email and nationalId uniqueness...");
    const [isEmailUsed, isNationalIdUsed] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ nationalId }),
    ]);

    if (isEmailUsed) {
      return res.status(400).json({ message: "Email already used" });
    }
    if (isNationalIdUsed) {
      return res.status(400).json({ message: "National ID already used" });
    }

    // 3️⃣ Validate password
    console.log("Step 3: Validating password...");
    Password.validatePasswordConfirmation(password, passwordConfirm);

    let isLeaked = false;
    try {
      isLeaked = await Password.valdiatePassword(password);
    } catch (err) {
      console.log("Skipping leak check:", err.message);
    }

    if (isLeaked) {
      return res.status(400).json({ message: "Password is leaked" });
    }

    // 4️⃣ Hash password
    const hashedPassword = await Password.hashPassword(password);

    // 5️⃣ Generate verification code
    const { code, hash } = await Misc.generateVerificaionCode();

    // ===============================
    // ✅ FIXED IMAGE SAVING SECTION
    // ===============================

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const uploadDir = path.join(__dirname, "..", "uploads", "profile-images");

    // ✅ create ONLY the directory
    await fs.mkdir(uploadDir, { recursive: true });

    // ✅ safer filename
    const fileName = randomUUID() + path.extname(req.file.originalname);

    const filePath = path.join(uploadDir, fileName);

    // ✅ write file
    await fs.writeFile(filePath, req.file.buffer);

    const dbPath = `/uploads/profile-images/${fileName}`;

    // ===============================

    // 6️⃣ Create user
    console.log("Step 6: Creating user in database...");
    const user = await User.create({
      lastName: isCodeExsit.lastName,
      firstName: isCodeExsit.firstName,
      nationalId: isCodeExsit.nationalId,
      registrationCode: isCodeExsit._id,
      email,
      password: hashedPassword,
      nickName,
      profileImage: dbPath,
      address: isCodeExsit.address,
      age: isCodeExsit.age,
      highSchoolName: isCodeExsit.highSchoolName,
      role: isCodeExsit.role,
      department: isCodeExsit.department,
      yearLevel: isCodeExsit.yearLevel || 1,
      verifyCode: hash,
      verifyCodeExpiresAt: Date.now() + 10 * 60 * 1000,
    });

    // 7️⃣ Mark code as used
    isCodeExsit.isUsed = true;
    isCodeExsit.usedBy = user._id;
    await isCodeExsit.save();

    // 8️⃣ Send email
    emailService
      .sendVerifyEmail(code, email, fullName)
      .catch((err) => console.log(err.message));

    // 9️⃣ Response
    return res.status(201).json({
      message: "User Created Successfully",
      user: {
        id: user._id,
        fullName,
        nationalId,
        email,
        nickName,
        photo: dbPath,
      },
    });
  } catch (error) {
    console.error("SignUp Error:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function resendEmail(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user.verifyCodeExpiresAt > Date.now()) {
    return res
      .status(400)
      .json({ message: "You can resend email after 10 minutes" });
  }

  // it's past 10mins so genereate a new token and send it again
  const { code, hash } = await Misc.generateVerificaionCode();

  user.verifyCode = hash;
  user.verifyCodeExpiresAt = Date.now() + 10 * 60 * 1000;

  await user.save();

  emailService.sendVerifyEmail(code, email, user.fullName).catch((err) => {
    console.log(`Error sending email: ${err.message}`);
  });

  return res.status(200).json({ message: "Verification email sent" });
}
async function verifyEmail(req, res) {
  const { code, user_id } = req.body;

  const user = await User.findById(user_id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isCodeMatching = await Misc.compareVerificaionCode(
    code,
    user.verifyCode,
  );
  if (!isCodeMatching) {
    return res.status(400).json({ message: "Invalid verification code" });
  }

  if (user.verifyCodeExpiresAt < Date.now()) {
    return res.status(400).json({ message: "Verification code expired" });
  }

  user.isVerified = true;
  user.verifyCode = null;
  user.verifyCodeExpiresAt = null;

  await user.save();

  return res.status(200).json({ message: "Email verified successfully" });
}

async function login(req, res) {
  // get email and password
  const { email, password } = req.body;

  // get User
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "Invalid email or password" });
  }

  // check if user is verified
  if (!user.isVerified) {
    return res.status(400).json({ message: "User is not verified" });
  }

  // check if password is correct
  const isPasswordMatching = await Password.comparePassword(
    password,
    user.password,
  );
  if (!isPasswordMatching) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  // generate token
  const token = jwtUtils.generateToken({ 
    id: user._id, 
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    nationalId: user.nationalId,
    email: user.email,
    profileImage: user.profileImage || null,
    yearLevel: user.yearLevel || null,
    groupId: user.groupId ? user.groupId.toString() : null,
  });
  // send response
  return res
    .status(200)
    .json({ message: "User logged in successfully", token });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { code, hash } = await Misc.generateVerificaionCode();

  user.passwordResetToken = hash;
  user.passwordResetTokenExpiresAt = Date.now() + 10 * 60 * 1000;

  await user.save();
  const resetLink = `${process.env.DOMAIN_NAME}/reset-password?token=${code}&userId=${user._id}`;
  emailService.sendResetPasswordEmail(resetLink, email).catch((err) => {
    console.log(`Error sending email: ${err.message}`);
  });

  return res.status(200).json({ message: "Reset password email sent" });
}

async function resetPassword(req, res) {
  const { token, userId, password, passwordConfirm } = req.body;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const isCodeMatching = await Misc.compareVerificaionCode(
    token,
    user.passwordResetToken,
  );
  if (!isCodeMatching) {
    return res.status(400).json({ message: "Invalid verification code" });
  }
  if (user.passwordResetTokenExpiresAt < Date.now()) {
    return res.status(400).json({ message: "Verification code expired" });
  }
  Password.validatePasswordConfirmation(password, passwordConfirm);
  const hashedPassword = await Password.hashPassword(password);
  user.password = hashedPassword;
  user.passwordResetToken = null;
  user.passwordResetTokenExpiresAt = null;
  await user.save();
  return res.status(200).json({ message: "Password reset successfully" });
}

async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const isMatch = await Password.comparePassword(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "كلمة المرور القديمة غير صحيحة" });

    user.password = await Password.hashPassword(newPassword);
    await user.save();
    return res.status(200).json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default {
  SignUp,
  resendEmail,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
};
