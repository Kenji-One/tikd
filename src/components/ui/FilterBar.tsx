"use client";

import FilterDropdown, { type FilterOption } from "./FilterDropdown";
import PlacesAddressInput from "@/components/ui/PlacesAddressInput";

export type FilterSortValue = "Trending" | "Newest" | "Largest";
export type FilterDateValue =
  | "Today"
  | "This Week"
  | "This Month"
  | "Right Now";

const SORT: FilterOption[] = [
  { label: "Trending", value: "Trending", disabled: true }, // no backend yet
  { label: "Newest", value: "Newest" },
  { label: "Largest", value: "Largest", disabled: true }, // no backend yet
];

const DATE: FilterOption[] = [
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
  { label: "Right Now", value: "Right Now" },
];

const LOCATION_PRESETS: FilterOption[] = [
  { label: "Near Me", value: "Near Me" },
  { label: "Brooklyn, NY", value: "Brooklyn, NY" },
  { label: "New York City", value: "New York City" },
  { label: "Los Angeles, CA", value: "Los Angeles, CA" },
];

type Props = {
  sort: FilterSortValue;
  date: FilterDateValue;
  location: string;

  onSort: (v: FilterSortValue) => void;
  onDate: (v: FilterDateValue) => void;
  onLocation: (v: string) => void;
};

export default function FilterBar({
  sort,
  date,
  location,
  onSort,
  onDate,
  onLocation,
}: Props) {
  return (
    <div className="mx-auto flex w-full justify-center px-2 sm:px-3">
      {/* Make sure the whole bar sits above page content */}
      <div className="relative z-[80] flex w-max items-center gap-4 rounded-full border border-white/10 bg-neutral-950/45 px-6 py-2 text-sm font-medium text-white/70 shadow-[0_14px_44px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
        <FilterDropdown
          value={sort}
          options={SORT}
          onSelect={(v) => onSort(v as FilterSortValue)}
          // smaller, consistent with reference
          widthClassName="w-40"
        />

        <FilterDropdown
          value={date}
          options={DATE}
          onSelect={(v) => onDate(v as FilterDateValue)}
          // smaller, consistent with reference
          widthClassName="w-40"
        />

        <div className="flex items-center gap-2">
          <span className="mr-1 text-white/80">in</span>

          <FilterDropdown
            value={location || "Anywhere"}
            options={LOCATION_PRESETS}
            onSelect={(v) => onLocation(v)}
            widthClassName="w-[260px]"
            footer={
              <div className="mt-2 border-t border-white/10 pt-2">
                <PlacesAddressInput
                  value={location}
                  onChange={(v) => onLocation(v)}
                  placeholder="Search a place…"
                  variant="filter"
                  hideErrorText
                />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
