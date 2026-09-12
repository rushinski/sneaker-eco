import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildCustomerDisplayId,
  buildCustomerRouteId,
  parseCustomerRouteId,
} from "@/lib/admin/customer-identifiers";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { logError } from "@/lib/utils/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const tenantId = session.profile?.tenant_id ?? null;
    const { customerId } = await params;
    const userId = parseCustomerRouteId(customerId);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid customer id", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", userId)
      .eq("role", "customer");

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return NextResponse.json(
        { error: "Customer not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        customer: {
          routeId: buildCustomerRouteId(data.id),
          displayId: buildCustomerDisplayId(data.id),
          name: data.full_name?.trim() || data.email || "Customer",
          email: data.email,
          role: data.role,
          createdAt: data.created_at,
          updatedAt: data.created_at,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/customers/[customerId]",
    });
    return NextResponse.json(
      { error: "Failed to fetch customer", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
