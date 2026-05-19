import { getSessionUser } from "@/lib/auth";
import { jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return jsonUnauthorized();
  }
  return jsonOk({ user });
}
