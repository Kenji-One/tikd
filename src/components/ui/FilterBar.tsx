"use client";

import { useState } from "react";
import FilterDropdown from "./FilterDropdown";

const SORT = ["Trending", "Newest", "Largest"];
const DATE = ["Today", "This Week", "This Month", "Right Now"];
const LOCATION = [
  "Near Me",
  "Brooklyn, NY",
  "New York City",
  "Los Angeles, CA",
];

export default function FilterBar() {
  const [sort, setSort] = useState(SORT[0]);
  const [date, setDate] = useState(DATE[1]);
  const [loc, setLoc] = useState("New York City");

  return (
    <div className="mx-auto w-full flex justify-center px-2 sm:px-3">
      <div className="flex w-max items-center gap-4 rounded-full bg-[#FFFFFF12] px-6 py-2  text-sm font-medium text-[#FFFFFF99]">
        <FilterDropdown value={sort} options={SORT} onSelect={setSort} />
        <FilterDropdown value={date} options={DATE} onSelect={setDate} />
        <div className="flex items-center gap-1">
          <span className="text-white mr-2">in</span>
          <FilterDropdown
            value={loc}
            options={LOCATION}
            onSelect={setLoc}
            allowInput
          />
        </div>
      </div>
    </div>
  );
}
