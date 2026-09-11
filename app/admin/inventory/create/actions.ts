// app/admin/inventory/create/actions.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ensureTenantId } from "@/lib/auth/tenant";

export async function getFormInitialData() {
  const session = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);

  const catalogRepo = new CatalogRepository(supabase);
  const brandsData = await catalogRepo.listBrandsWithGroups(tenantId);

  return {
    brands: brandsData.map((brand) => ({
      id: brand.id,
      label: brand.canonical_label,
      groupKey: brand.group?.key ?? null,
    })),
  };
}
