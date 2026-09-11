import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { STATE_NAMES } from "@/config/constants/nexus-thresholds";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TenantContextService } from "@/services/tenant-context-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await new TenantContextService(supabase).getTenantId(
      session.user.id,
    );
    const registrations = await new NexusRepository(supabase).getRegistrationsByTenant(
      tenantId,
    );
    const byState = new Map(
      registrations.map((registration) => [registration.state_code, registration]),
    );

    const states = Object.entries(STATE_NAMES).map(([stateCode, stateName]) => {
      const registration = byState.get(stateCode);
      return {
        stateCode,
        stateName,
        nexusType: registration?.registration_type ?? "economic",
        isRegistered: registration?.is_registered ?? false,
      };
    });

    return NextResponse.json({ states }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/summary" });
    return NextResponse.json(
      { error: "Failed to fetch nexus settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
