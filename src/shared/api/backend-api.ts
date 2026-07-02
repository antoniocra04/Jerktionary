import { requestJson } from "./http-client";
import type { BackendDocsDto, HealthDto, ReadyDto, ReadyStatus } from "@/shared/types/backend";

export const backendApi = {
  health: () => requestJson<HealthDto>("/health"),
  ready: async (): Promise<ReadyStatus> => {
    const dto = await requestJson<ReadyDto>("/ready");

    return {
      ready: dto.ready,
      components: Object.entries(dto.components).map(([name, component]) => ({
        name,
        ...component
      }))
    };
  },
  docs: () => requestJson<BackendDocsDto>("/api/docs")
};
