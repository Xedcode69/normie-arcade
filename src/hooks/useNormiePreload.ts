"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";

const personas = ["Serious dealer", "Lucky dealer", "Precise dealer", "Chaotic dealer", "Robotic dealer"] as const;
const roles = ["Expression Croupier", "Arena Master", "DNA Card Sharp", "Prediction Host", "Cashier"] as const;

export function useNormiePreload() {
  const setDealers = useArcadeStore((state) => state.setDealers);
  const setLoadedNormies = useArcadeStore((state) => state.setLoadedNormies);

  const query = useQuery({
    queryKey: ["normie-preload"],
    queryFn: () => NormieAPIService.preloadNormies(18)
  });

  useEffect(() => {
    if (!query.data) return;
    setLoadedNormies(query.data);
    setDealers(
      roles.map((role, index) => ({
        role,
        persona: personas[index],
        normie: query.data[index]
      }))
    );
  }, [query.data, setDealers, setLoadedNormies]);

  return query;
}
