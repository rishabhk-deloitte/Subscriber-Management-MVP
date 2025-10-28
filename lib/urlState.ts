import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ContextComposerInput, Objective, RadarFilters, SegmentRuleGroup } from "./types";

const encodeJSON = (value: unknown) => encodeURIComponent(JSON.stringify(value));
const decodeJSON = <T,>(value: string | null): T | undefined => {
  if (!value) return undefined;
  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch (error) {
    console.warn("Failed to decode URL state", error);
    return undefined;
  }
};

export const encodeContextToSearch = (context: ContextComposerInput) => `context=${encodeJSON(context)}`;

export const decodeContextFromSearch = (searchParams: URLSearchParams): ContextComposerInput | undefined =>
  decodeJSON<ContextComposerInput>(searchParams.get("context"));

export const encodeObjectiveToSearch = (objective: Objective) => `objective=${encodeJSON(objective)}`;

export const decodeObjectiveFromSearch = (searchParams: URLSearchParams): Objective | undefined =>
  decodeJSON<Objective>(searchParams.get("objective"));

export const encodeRadarFilters = (filters: RadarFilters) => `filters=${encodeJSON(filters)}`;

export const decodeRadarFilters = (searchParams: URLSearchParams): RadarFilters | undefined =>
  decodeJSON<RadarFilters>(searchParams.get("filters"));

const toBase64Url = (value: string) => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64url");
  }
  if (typeof window !== "undefined") {
    const base64 = window.btoa(unescape(encodeURIComponent(value)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return encodeURIComponent(value);
};

const fromBase64Url = (value: string) => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf-8");
  }
  if (typeof window !== "undefined") {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const padded = `${normalized}${padding}`;
    return decodeURIComponent(escape(window.atob(padded)));
  }
  return decodeURIComponent(value);
};

const serializeRules = (rules: SegmentRuleGroup) => toBase64Url(JSON.stringify(rules));

const deserializeRules = (encoded: string): SegmentRuleGroup | undefined => {
  try {
    const json = fromBase64Url(encoded);
    return JSON.parse(json) as SegmentRuleGroup;
  } catch (error) {
    console.warn("Failed to decode segment rules", error);
    return undefined;
  }
};

export const encodeRulesParam = (rules: SegmentRuleGroup) => `rules=${serializeRules(rules)}`;

export const decodeRulesParam = (searchParams: URLSearchParams): SegmentRuleGroup | undefined => {
  const encoded = searchParams.get("rules");
  if (!encoded) return undefined;
  return deserializeRules(encoded);
};

export const encodeSeedId = (seedId: string) => `seedId=${encodeURIComponent(seedId)}`;

export const decodeSeedId = (searchParams: URLSearchParams): string | undefined => {
  const value = searchParams.get("seedId");
  return value ? decodeURIComponent(value) : undefined;
};

export const encodeSeedOpportunity = (opportunityId: string) => `seedOpportunityId=${encodeURIComponent(opportunityId)}`;

export const decodeSeedOpportunity = (searchParams: URLSearchParams): string | undefined => {
  const value = searchParams.get("seedOpportunityId");
  return value ? decodeURIComponent(value) : undefined;
};

type QueryStateOptions<T> = {
  parse?: (value: string | null) => T;
  serialize?: (value: T) => string;
  defaultValue?: T;
};

const defaultParse = <T,>(value: string | null): T | undefined => {
  if (value == null) return undefined;
  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch (error) {
    console.warn("Failed to parse query state", error);
    return undefined;
  }
};

const defaultSerialize = <T,>(value: T) => encodeURIComponent(JSON.stringify(value));

export const useQueryState = <T,>(key: string, options: QueryStateOptions<T> = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { parse = defaultParse as NonNullable<QueryStateOptions<T>["parse"]>, serialize = defaultSerialize, defaultValue } =
    options;

  const value = useMemo(() => {
    const raw = searchParams.get(key);
    const parsed = parse(raw);
    if (parsed === undefined) {
      return defaultValue as T | undefined;
    }
    return parsed;
  }, [defaultValue, key, parse, searchParams]);

  const setValue = useCallback(
    (next: T | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === undefined || next === null) {
        params.delete(key);
      } else {
        params.set(key, serialize(next));
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [key, pathname, router, searchParams, serialize],
  );

  return [value ?? defaultValue, setValue] as const;
};

export const copyDeepLink = async (elementId?: string) => {
  if (typeof window === "undefined") return undefined;
  const url = new URL(window.location.href);
  if (elementId) {
    url.hash = elementId;
  }
  try {
    await navigator.clipboard.writeText(url.toString());
    return url.toString();
  } catch (error) {
    console.warn("Failed to copy deep link", error);
    return url.toString();
  }
};
