// app/api/account/password/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { isPasswordValid } from "@/lib/validation/password";

const passwordSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireUserApi();
    const body = await request.json().catch(() => null);
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!isPasswordValid(parsed.data.password)) {
      return NextResponse.json(
        { error: "Password does not meet the required criteria.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/password",
    });
    return NextResponse.json(
      { error: "Failed to change password", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
