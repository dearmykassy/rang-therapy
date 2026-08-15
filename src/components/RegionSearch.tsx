"use client";

import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  findBestActiveRegion,
  searchActiveRegions,
  type RegionSearchEntry,
} from "@/lib/region-search";

type RegionSearchProps = {
  className: string;
  onNavigate?: () => void;
  placeholder?: string;
};

function optionId(baseId: string, index: number): string {
  return `${baseId}-option-${index}`;
}

export function RegionSearch({
  className,
  onNavigate,
  placeholder = "서비스 받을 지역을 찾아보세요",
}: RegionSearchProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const generatedId = useId().replace(/:/g, "");
  const listboxId = `region-search-${generatedId}`;
  const results = useMemo(() => searchActiveRegions(query), [query]);
  const isOpen = expanded && results.length > 0;
  const activeResult = activeIndex >= 0 ? results[activeIndex] ?? null : null;

  const navigate = (result: RegionSearchEntry | null) => {
    setExpanded(false);
    setActiveIndex(-1);
    onNavigate?.();
    window.location.assign(result?.path ?? "/areas/");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(activeResult ?? findBestActiveRegion(query));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      setActiveIndex(-1);
      return;
    }

    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setExpanded(true);
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setExpanded(true);
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      navigate(activeResult);
    }
  };

  return (
    <form
      action="/areas/"
      className={className}
      data-region-search="true"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        window.setTimeout(() => setExpanded(false), 120);
      }}
      onSubmit={handleSubmit}
    >
      <input
        aria-activedescendant={isOpen && activeResult ? optionId(listboxId, activeIndex) : undefined}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="서비스 지역 검색"
        autoComplete="off"
        className="region-search-input"
        onChange={(event) => {
          setQuery(event.target.value);
          setExpanded(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setExpanded(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        spellCheck={false}
        type="search"
        value={query}
      />
      <button aria-label="지역 검색" className="region-search-submit" type="submit">
        <span aria-hidden="true">⌕</span>
      </button>
      {isOpen ? (
        <div className="region-search-suggestions" id={listboxId} role="listbox" aria-label="지역 검색 결과">
          {results.map((result, index) => (
            <div
              aria-selected={index === activeIndex}
              className={`region-search-option${index === activeIndex ? " is-active" : ""}`}
              id={optionId(listboxId, index)}
              key={result.id}
              onClick={() => navigate(result)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(result);
                }
              }}
              role="option"
              tabIndex={-1}
            >
              <span>{result.displayName}</span>
              <small>{result.qualifiedName}</small>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}
