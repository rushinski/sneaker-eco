export type NexusType = "physical" | "economic";

export type StateSummary = {
  stateCode: string;
  stateName: string;
  nexusType: NexusType;
  isRegistered: boolean;
};

export type NexusData = {
  states: StateSummary[];
};
