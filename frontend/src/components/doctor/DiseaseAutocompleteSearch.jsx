import React, { useState, useEffect, useRef, useMemo } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Badge } from '../ui';

/**
 * DiseaseAutocompleteSearch
 * 
 * Live search and autocomplete selector for the 6 core disease registry panels.
 * Supports debounced query filtering, keyboard arrow navigation (Up/Down/Enter/Escape),
 * search matching on condition name, clinical category, description, and primary biomarkers,
 * and quick-pick condition chips.
 */
export function DiseaseAutocompleteSearch({
  diseases = [],
  selectedDiseaseId = '',
  onSelectDisease,
  loading = false,
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Active selected disease object from the unified registry
  const selectedDisease = useMemo(() => {
    return diseases.find((d) => d.id === selectedDiseaseId || d.disease_key === selectedDiseaseId) || null;
  }, [diseases, selectedDiseaseId]);

  // Filtered diseases based on live search query
  const filteredDiseases = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return diseases;

    return diseases.filter((d) => {
      const nameMatch = (d.name || d.display_name || '').toLowerCase().includes(q);
      const keyMatch = (d.id || d.disease_key || '').toLowerCase().includes(q);
      const catMatch = (d.category || '').toLowerCase().includes(q);
      const descMatch = (d.description || '').toLowerCase().includes(q);
      const guidelineMatch = (d.clinical_guideline || '').toLowerCase().includes(q);
      
      const biomarkerMatch = (d.primary_biomarkers || []).some((b) => b.toLowerCase().includes(q)) ||
        (d.primary_tests || []).some((t) => t.toLowerCase().includes(q)) ||
        (d.primary_biomarkers_detail || []).some((bd) => (bd.display_name || '').toLowerCase().includes(q));

      return nameMatch || keyMatch || catMatch || descMatch || guidelineMatch || biomarkerMatch;
    });
  }, [diseases, query]);

  // Reset highlighted index when filter results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredDiseases]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (disease) => {
    if (onSelectDisease && disease) {
      onSelectDisease(disease);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredDiseases.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredDiseases.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDiseases[highlightedIndex]) {
        handleSelect(filteredDiseases[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-3 ${className}`}>
      
      {/* 1. Search Bar & Filter Controls */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 pointer-events-none text-[#7E9993] flex items-center justify-center">
            <DoodleIcon name="stethoscope" className="w-4 h-4 text-[#1E4D45] dark:text-[#57BA8E]" />
          </div>

          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="disease-autocomplete-listbox"
            aria-autocomplete="list"
            placeholder="Search disease, condition, or biomarker (e.g. Type 2 Diabetes, HbA1c, CKD, Lipids)..."
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-24 py-2.5 rounded-[8px] text-xs sm:text-sm font-medium bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] text-[#13221F] dark:text-[#EFF5F3] placeholder-[#7E9993] shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#1E4D45] dark:focus:ring-[#57BA8E] focus:border-transparent"
          />

          <div className="absolute right-2.5 flex items-center space-x-1.5">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-[4px] text-[#7E9993] hover:text-[#13221F] dark:hover:text-[#EFF5F3] hover:bg-[#E5EFEA] dark:hover:bg-[#1C2725] transition-colors"
                title="Clear query"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }}
              className="p-1 px-1.5 rounded-[4px] text-[11px] font-semibold bg-[#E5EFEA] text-[#1E4D45] dark:bg-[#1C2725] dark:text-[#57BA8E] hover:bg-[#D5E4DE] transition-colors cursor-pointer"
            >
              {isOpen ? 'Close ▲' : 'Browse ▼'}
            </button>
          </div>
        </div>

        {/* 2. Autocomplete Popover Dropdown */}
        {isOpen && (
          <div
            id="disease-autocomplete-listbox"
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-1.5 max-h-[380px] overflow-y-auto rounded-[10px] bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] shadow-lg animate-in fade-in zoom-in-95 duration-150 p-1.5 space-y-1 divide-y divide-[#E0E7E4] dark:divide-[#22312E]"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993] flex items-center justify-between">
              <span>Disease Registry Panels ({filteredDiseases.length})</span>
              <span className="font-mono text-[9px] text-[#7E9993]">↑↓ Navigate • ↵ Select • Esc Close</span>
            </div>

            <div className="pt-1 space-y-1">
              {filteredDiseases.length > 0 ? (
                filteredDiseases.map((d, index) => {
                  const isSelected = (d.id || d.disease_key) === selectedDiseaseId;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={d.id || d.disease_key}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(d)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`p-2.5 rounded-[6px] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isHighlighted
                          ? 'bg-[#E5EFEA] text-[#13221F] dark:bg-[#1C2725] dark:text-[#EFF5F3]'
                          : isSelected
                          ? 'bg-[#F4F6F5] dark:bg-[#182321]'
                          : 'hover:bg-[#F4F6F5] dark:hover:bg-[#1C2725]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-[#13221F] dark:text-[#EFF5F3]">
                            {d.name || d.display_name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#E0E7E4] text-[#1E4D45] dark:bg-[#253632] dark:text-[#57BA8E]">
                            {d.category}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#1E4D45] dark:text-[#57BA8E] flex items-center space-x-0.5">
                              <span>✓ Active</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993] line-clamp-1">
                          {d.description}
                        </p>

                        {/* Biomarker Chips in Dropdown Item */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(d.primary_biomarkers_detail || []).slice(0, 4).map((b) => (
                            <span
                              key={b.key}
                              className="text-[9px] font-mono px-1 py-0.2 rounded bg-white dark:bg-[#111816] border border-[#CBD6D2] dark:border-[#2F433E] text-[#4E6863] dark:text-[#7E9993]"
                            >
                              {b.display_name}
                            </span>
                          ))}
                          {(d.primary_biomarkers || []).length > 4 && (
                            <span className="text-[9px] font-mono text-[#7E9993]">
                              +{(d.primary_biomarkers.length - 4)} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Meta Column */}
                      <div className="text-right shrink-0 text-[10px] text-[#7E9993] space-y-0.5 self-start sm:self-center">
                        {d.heritability_range_text && (
                          <div className="font-mono font-semibold text-[#1E4D45] dark:text-[#57BA8E]">
                            h² {d.heritability_range_text}
                          </div>
                        )}
                        <div className="text-[9px]">
                          {(d.primary_biomarkers || d.primary_tests || []).length} biomarkers
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-[#7E9993]">
                    No clinical conditions matching "<strong>{query}</strong>" in the disease registry.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-xs font-semibold text-[#1E4D45] dark:text-[#57BA8E] hover:underline"
                  >
                    View all 6 registered diseases
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Quick-Pick Condition Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E9993] shrink-0 mr-1">
          Quick Pick:
        </span>
        {diseases.map((d) => {
          const isSelected = (d.id || d.disease_key) === selectedDiseaseId;
          return (
            <button
              key={d.id || d.disease_key}
              type="button"
              onClick={() => handleSelect(d)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1 border ${
                isSelected
                  ? 'bg-[#1E4D45] text-white border-[#1E4D45] shadow-xs dark:bg-[#336E63] dark:border-[#336E63]'
                  : 'bg-[#F4F6F5] dark:bg-[#1C2725] border-[#CBD6D2] dark:border-[#2F433E] text-[#4E6863] dark:text-[#7E9993] hover:text-[#13221F] dark:hover:text-[#EFF5F3] hover:border-[#1E4D45]'
              }`}
            >
              <span>{d.name || d.display_name}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Selected Disease Overview Banner */}
      {selectedDisease && (
        <div className="p-3 sm:p-4 rounded-[8px] bg-[#E5EFEA]/40 dark:bg-[#1A2C28]/40 border border-[#CBD6D2] dark:border-[#2F433E] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E]">
                Active Pathology Panel
              </span>
              <span className="text-[#7E9993]">•</span>
              <h2 className="text-sm sm:text-base font-bold text-[#13221F] dark:text-[#EFF5F3]">
                {selectedDisease.name || selectedDisease.display_name}
              </h2>
              <Badge status="juniper" size="sm">
                {selectedDisease.category}
              </Badge>
              {selectedDisease.heritability_range_text && (
                <Badge status="neutral" size="sm">
                  Heritability (h²): {selectedDisease.heritability_range_text}
                </Badge>
              )}
            </div>

            <p className="text-xs text-[#4E6863] dark:text-[#7E9993]">
              {selectedDisease.description}
            </p>

            {selectedDisease.clinical_guideline && (
              <div className="text-[10px] text-[#7E9993] flex items-center space-x-1 pt-0.5">
                <span className="font-semibold text-[#4E6863] dark:text-[#CBD6D2]">Guideline:</span>
                <span>{selectedDisease.clinical_guideline}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-start md:self-center">
            <span className="text-xs font-mono text-[#4E6863] dark:text-[#7E9993]">
              {(selectedDisease.primary_biomarkers || selectedDisease.primary_tests || []).length} Relevant Biomarkers
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiseaseAutocompleteSearch;
