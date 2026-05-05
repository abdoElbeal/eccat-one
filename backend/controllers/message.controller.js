import Message from "../models/Message.js";
import User    from "../models/User.js";
import mongoose from "mongoose";

// ─── 1. SEND MESSAGE ─────────────────────────────────────────────────────────
async function sendMessage(req, res) {
  try {
    const { to, content, conversationId } = req.body;
    let recipientId = to;

    // If conversationId is provided but not 'to', derive recipient from conversationId
    if (!recipientId && conversationId) {
      const parts = conversationId.split("-");
      recipientId = parts.find(p => p !== req.user._id.toString());
    }

    if (!recipientId || !content) {
      return res.status(400).json({ message: "Recipient and content are required" });
    }

    // RESTRICTION: Student can only message doctors
    if (req.user.role === "student") {
      const recipient = await User.findById(recipientId).select("role").lean();
      if (!recipient || recipient.role !== "doctor") {
        return res.status(403).json({ message: "لا يُسمح للطلاب بمراسلة سوى أعضاء هيئة التدريس." });
      }
    }

    const newMessage = new Message({
      sender:    req.user._id,
      recipient: recipientId,
      content,
    });

    await newMessage.save();

    return res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 2. GET CONVERSATIONS ────────────────────────────────────────────────────
async function getConversations(req, res) {
  try {
    const myId = req.user._id.toString();

    // Aggregate to find unique conversationIds
    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: req.user._id }, { recipient: req.user._id }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$recipient", req.user._id] }, { $eq: ["$isRead", false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    const enriched = await Promise.all(conversations.map(async conv => {
      const otherId = conv.lastMessage.sender.toString() === myId 
        ? conv.lastMessage.recipient.toString() 
        : conv.lastMessage.sender.toString();
      
      const otherUser = await User.findById(otherId).select("firstName lastName email role profileImage").lean();
      
      return {
        id:          conv._id,
        otherUser:   otherUser ? {
          _id:  otherUser._id,
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          role: otherUser.role,
          avatar: otherUser.profileImage
        } : null,
        lastMessage: {
          content: conv.lastMessage.content,
          time:    conv.lastMessage.createdAt,
          isMine:  conv.lastMessage.sender.toString() === myId
        },
        unread:      conv.unreadCount
      };
    }));

    return res.status(200).json({ conversations: enriched.filter(c => c.otherUser) });
  } catch (err) {
    console.error("getConversations error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 3. GET MESSAGES IN CONVERSATION ─────────────────────────────────────────
async function getMessages(req, res) {
  try {
    const { id: conversationId } = req.params;
    
    // Mark as read
    await Message.updateMany(
      { conversationId, recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", "firstName lastName profileImage")
      .lean();

    const formatted = messages.map(m => ({
      _id:        m._id,
      content:    m.content,
      createdAt:  m.createdAt,
      sender:     m.sender._id,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      isMine:     m.sender._id.toString() === req.user._id.toString()
    }));

    return res.status(200).json({ messages: formatted });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 4. SEARCH USERS FOR NEW MESSAGE ─────────────────────────────────────────
async function searchUsers(req, res) {
  try {
    const { q, role } = req.query;
    if (!q || q.length < 2) return res.status(200).json({ users: [] });

    const filter = {
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName:  { $regex: q, $options: "i" } },
        { email:     { $regex: q, $options: "i" } }
      ],
      _id: { $ne: req.user._id } // Don't include self
    };

    if (role) filter.role = role;
    
    // RESTRICTION: Student can only search for doctors
    if (req.user.role === "student") {
      filter.role = "doctor";
    }

    const users = await User.find(filter)
      .select("firstName lastName role profileImage email")
      .limit(10)
      .lean();

    return res.status(200).json({
      users: users.map(u => ({
        _id:  u._id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        avatar: u.profileImage,
        email: u.email
      }))
    });
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default {
  sendMessage,
  getConversations,
  getMessages,
  searchUsers
};
