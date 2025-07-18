"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

type Props = {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  allowInput?: boolean;
};

export default function FilterDropdown({
  value,
  options,
  onSelect,
  allowInput = false,
}: Props) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      {/* ---------- Trigger ---------- */}
      <Menu.Button className="flex items-center gap-2 py-1 text-sm leading-[100%] font-medium text-[#FFFFFF99] transition cursor-pointer">
        {value}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="6"
          viewBox="0 0 11 6"
          fill="none"
        >
          <path
            d="M9.29165 1.10413L5.49998 4.89579L1.70831 1.10413"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Menu.Button>

      {/* ---------- Items ---------- */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items
          /* `top-full` keeps the list anchored just below the trigger */
          className="absolute left-0 top-full z-50 mt-2 w-52 origin-top-left rounded-xl bg-neutral-0 p-2 text-neutral-900 shadow-lg focus:outline-none"
        >
          {options.map((opt) => (
            <Menu.Item key={opt}>
              {({ active }) => (
                <button
                  type="button"
                  onClick={() => onSelect(opt)}
                  className={clsx(
                    "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition",
                    active ? "bg-neutral-100" : "bg-neutral-0"
                  )}
                >
                  {opt}
                </button>
              )}
            </Menu.Item>
          ))}

          {allowInput && (
            <div className="mt-2 border-t border-neutral-100 pt-2">
              <input
                type="text"
                placeholder="Enter a city"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onSelect(e.currentTarget.value.trim());
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
