import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";

interface SearchableFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder?: string;
}

const SearchableFilterSelect: React.FC<SearchableFilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, dropUp: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const dropUp = spaceBelow < 240 && rect.top > 240;

          setCoords({
            top: dropUp ? rect.top - 4 : rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            dropUp,
          });
        }
      };

      updatePosition();
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const portalEl = document.getElementById(
        `filter-dropdown-portal-${label.replace(/[^a-zA-Z0-9]/g, "-")}`
      );
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        portalEl &&
        !portalEl.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [label]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
  };

  const portalId = `filter-dropdown-portal-${label.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 flex items-center justify-between transition-all outline-none ${
          isOpen
            ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white"
            : value
            ? "border-indigo-300 font-medium text-gray-900 bg-indigo-50/20"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <span className="truncate pr-2">
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </div>
      </button>

      {isOpen &&
        createPortal(
          <div
            id={portalId}
            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden flex flex-col transition-all duration-100"
            style={{
              top: coords.dropUp ? undefined : `${coords.top}px`,
              bottom: coords.dropUp ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, 200)}px`,
              maxHeight: "240px",
            }}
          >
            {/* Search Box Header */}
            <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Search size={14} className="text-gray-400 flex-shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs py-1 px-1 focus:outline-none text-gray-800 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="overflow-y-auto flex-1 p-1">
              {/* Reset / All Option */}
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                  !value
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{placeholder}</span>
                {!value && <Check size={14} className="text-indigo-600" />}
              </button>

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                      value === option
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate pr-2">{option}</span>
                    {value === option && (
                      <Check size={14} className="text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No options found
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableFilterSelect;
