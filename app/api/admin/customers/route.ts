import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildCustomerDisplayId,
  buildCustomerRouteId,
} from "@/lib/admin/customer-identifiers";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { logError } from "@/lib/utils/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const tenantId = session.profile?.tenant_id ?? null;
    const admin = createSupabaseAdminClient();
    let query = admin
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const customers = (data ?? []).map((profile) => ({
      routeId: buildCustomerRouteId(profile.id),
      displayId: buildCustomerDisplayId(profile.id),
      name: profile.full_name?.trim() || profile.email || "Customer",
      email: profile.email,
      role: profile.role,
      createdAt: profile.created_at,
    }));

    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/customers" });
    return NextResponse.json(
      { error: "Failed to fetch customers", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
