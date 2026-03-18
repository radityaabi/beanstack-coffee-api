import { sign, verify } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { prisma } from "./prisma";

// ─── Secrets ───
function getJwtSecret(): string {
  return process.env.JWT_SECRET || "default-secret-change-me";
}

// ─── Expiry ───
export const ACCESS_TOKEN_EXPIRY_SECONDS = 60 * 15; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

// ─── Access Token ───
export async function signToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return await sign(
    {
      ...payload,
      type: "access",
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY_SECONDS,
    },
    getJwtSecret(),
    "HS256",
  );
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const payload = await verify(token, getJwtSecret(), "HS256");
    if ((payload as any).type !== "access") return null;
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function generateRefreshToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return await sign(
    {
      ...payload,
      type: "refresh",
      exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY_SECONDS,
    },
    getJwtSecret(),
    "HS256",
  );
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const payload = await verify(token, getJwtSecret(), "HS256");
    if ((payload as any).type !== "refresh") return null;
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function createTokenPair(user: {
  id: string;
  email: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await signToken({ userId: user.id, email: user.email });
  const refreshToken = await generateRefreshToken({
    userId: user.id,
    email: user.email,
  });

  return { accessToken, refreshToken };
}

// ─── Auth Middleware ───
export const authMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized. Bearer token required." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyToken(token);

    if (!payload) {
      return c.json({ error: "Invalid or expired token." }, 401);
    }

    const activeToken = await prisma.userToken.findUnique({
      where: { accessToken: token },
    });

    if (!activeToken) {
      return c.json({ error: "Token has been revoked." }, 401);
    }

    c.set("userId" as never, payload.userId as never);
    c.set("email" as never, payload.email as never);

    await next();
  },
);
