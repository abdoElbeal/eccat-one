import mongoose from "mongoose";

export default async function connectDB() {
  try {
    const DB_URL = process.env.DB;
    const conn = await mongoose.connect(DB_URL);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error while connecting to DB:", error.message);
    process.exit(1);
  }
}
