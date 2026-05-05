// sendEmails.js
import { getMailtrapClient } from "./config.js";

async function sendVerifyEmail(verifyCode, emailAddress, name) {
  const { client, sender } = getMailtrapClient();

  try {
    const email = await client.send({
      from: sender,
      to: [{ email: emailAddress }],
      template_uuid: process.env.VERIFY_CODE_TEMPLATE_UUID,
      template_variables: {
        name,
        verificationCode: verifyCode,
      },
    });

    console.log("Mail sent successfully:", email, emailAddress, verifyCode);
  } catch (err) {
    console.error("Mailtrap error:", err);
  }
}

async function sendResetPasswordEmail(urlResetLink, emailAddress) {
  const { client, sender } = getMailtrapClient();

  try {
    const email = await client.send({
      from: sender,
      to: [{ email: emailAddress }],
      template_uuid: process.env.RESET_PASSWORD_TEMPLATE_UUID,
      template_variables: {
        resetLink: urlResetLink,
      },
    });

    console.log("Reset password email sent:", email);
  } catch (err) {
    console.error("Mailtrap error:", err);
  }
}

export default { sendVerifyEmail, sendResetPasswordEmail };
