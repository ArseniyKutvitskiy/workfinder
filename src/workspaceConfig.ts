import type { Profile } from "../shared/schemas.ts";
import { resolveLocation, currencyFor } from "../shared/geo.ts";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BriefcaseBusiness,
  Bookmark,
} from "lucide-react";
export const navigation: [string, LucideIcon, string][] = [
  ["overview", LayoutDashboard, "Overview"],
  ["chat", MessageSquare, "Resume assistant"],
  ["resume", FileText, "My resume"],
  ["jobs", BriefcaseBusiness, "Explore jobs"],
  ["saved", Bookmark, "Saved jobs"],
];
export const defaultFilters = {
  source: "all",
  keyword: "",
  city: "",
  country: "",
  level: "",
  remote: "",
  roleType: "",
  salary: 0,
  currency: "KZT",
};
export type Filters = typeof defaultFilters;

/** Search defaults derived from the resume: role as keyword, home city/country, local currency. */
export function personalFilters(profile: Profile): Filters {
  const place = resolveLocation(profile.city, profile.country);
  return {
    ...defaultFilters,
    keyword: profile.occupation.trim().slice(0, 80),
    city: place.city,
    country: place.country,
    currency: currencyFor(place.country),
  };
}
