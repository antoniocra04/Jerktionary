import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { backendApi } from "@/shared/api/backend-api";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

export function useBackendStatus() {
  const healthQuery = useQuery({
    queryKey: ["backend", "health"],
    queryFn: backendApi.health,
    refetchInterval: 30_000
  });

  const readyQuery = useQuery({
    queryKey: ["backend", "ready"],
    queryFn: backendApi.ready,
    refetchInterval: 30_000
  });

  useEffect(() => {
    if (readyQuery.data) {
      useTranscriptStore
        .getState()
        .setBackendStatus(readyQuery.data.ready, readyQuery.data.components);
    }
  }, [readyQuery.data]);

  return {
    health: healthQuery.data,
    ready: readyQuery.data,
    isLoading: healthQuery.isLoading || readyQuery.isLoading,
    isUnavailable: healthQuery.isError || readyQuery.isError,
    error: healthQuery.error ?? readyQuery.error,
    refetch: async () => {
      await Promise.all([healthQuery.refetch(), readyQuery.refetch()]);
    }
  };
}
