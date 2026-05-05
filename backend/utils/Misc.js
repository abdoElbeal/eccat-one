import bcryptjs from "bcryptjs";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000);
}

async function generateVerificaionCode() {
  const code = generateCode();
  const hash = await bcryptjs.hash(code.toString(), 10);
  return { code, hash };
}

async function compareVerificaionCode(code, hash) {
  return await bcryptjs.compare(code, hash);
}

export default {
  generateVerificaionCode,
  compareVerificaionCode,
};
