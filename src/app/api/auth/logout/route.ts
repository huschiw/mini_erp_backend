import { getSessionUser } from "@/lib/auth";
import { jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return jsonUnauthorized();
  }
  return jsonOk({ message: "Logged out successfully" });
}
