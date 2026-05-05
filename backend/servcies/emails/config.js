import { MailtrapClient } from "mailtrap";

export const getMailtrapClient = () => {
  const token = process.env.MAILTRAP_TOKEN;
  if (!token) throw new Error("MAILTRAP_TOKEN is undefined!");

  const client = new MailtrapClient({ token });

  const sender = {
    email: process.env.MAILTRAP_SENDER_EMAIL || "test@example.com",
    name: process.env.MAILTRAP_SENDER_NAME || "My App",
  };

  return { client, sender };
};
