import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function serverApp() {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!projectId || !clientEmail || !privateKey || !databaseURL) throw new Error("Firebase Admin environment variables are missing");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

export async function requireAuthenticated(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("UNAUTHENTICATED");
  return getAuth(serverApp()).verifyIdToken(token);
}

export async function requireAdmin(request: Request) {
  const decoded = await requireAuthenticated(request);
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!decoded.email || !allowed.includes(decoded.email.toLowerCase())) throw new Error("FORBIDDEN");
  return decoded;
}

export async function adminServices() {
  const app = serverApp();
  return { auth: getAuth(app), database: getDatabase(app) };
}
