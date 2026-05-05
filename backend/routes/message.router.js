import express from "express";
import messageController from "../controllers/message.controller.js";
import authMiddleware    from "../middlewares/auth.middleware.js";

const router = express.Router();

// All message routes require authentication
router.use(authMiddleware.authenticateToken);

router.post("/",                messageController.sendMessage);
router.get("/conversations",    messageController.getConversations);
router.get("/conversation/:id", messageController.getMessages);
router.get("/search",           messageController.searchUsers);

export default router;
