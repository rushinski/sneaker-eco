import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type NexusRegistration = {
  id: string;
  tenant_id: string;
  state_code: string;
  registration_type: "physical" | "economic";
  is_registered: boolean;
  registered_at: string | null;
  created_at: string;
  updated_at: string;
  tracking_started_at: string | null;
};

export class NexusRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getRegistrationsByTenant(tenantId: string): Promise<NexusRegistration[]> {
    const { data, error } = await this.supabase
      .from("nexus_registrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("state_code");

    if (error) {
      throw error;
    }
    return (data ?? []) as NexusRegistration[];
  }

  async getRegistration(tenantId: string, stateCode: string) {
    const { data, error } = await this.supabase
      .from("nexus_registrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("state_code", stateCode)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data as NexusRegistration | null;
  }

  async upsertRegistration(input: {
    tenantId: string;
    stateCode: string;
    registrationType: "physical" | "economic";
    isRegistered: boolean;
    registeredAt?: string | null;
  }) {
    const existing = await this.getRegistration(input.tenantId, input.stateCode);
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("nexus_registrations")
      .upsert(
        {
          tenant_id: input.tenantId,
          state_code: input.stateCode,
          registration_type: input.registrationType,
          is_registered: input.isRegistered,
          registered_at: input.isRegistered ? (input.registeredAt ?? now) : null,
          tracking_started_at: input.isRegistered
            ? (existing?.tracking_started_at ?? now)
            : null,
          updated_at: now,
        },
        { onConflict: "tenant_id,state_code" },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as NexusRegistration;
  }
}
