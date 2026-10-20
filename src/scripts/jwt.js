import jwt from "jsonwebtoken";

const ALICE_ID = "11111111-1111-1111-1111-111111111111";
const BOB_ID = "22222222-2222-2222-2222-222222222222";

function signToken(userId, secretKey) {
  const payload = { sub: userId };
  return jwt.sign(payload, secretKey);
}

const data = signToken(BOB_ID, "super-secret-jwt-key"); 
console.log("JWT Token:", data);

const decoded = jwt.verify(data, "super-secret-jwt-key");
console.log("Decoded Token:", decoded);

