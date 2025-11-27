import * as React from "react";
import { X, Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found",
  className,
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef(null);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
        setSearchQuery("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const toggleOption = (optionId) => {
    if (disabled) return;
    
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    
    onChange(newSelected);
  };

  const removeOption = (optionId, e) => {
    e.stopPropagation();
    if (disabled) return;
    
    const newSelected = selected.filter((id) => id !== optionId);
    onChange(newSelected);
  };

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "w-full justify-between min-h-10 h-auto",
          !selected.length && "text-muted-foreground"
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 ? (
            <span>{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <Badge
                key={option.value}
                variant="secondary"
                className="mr-1 mb-1"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(option.value, e);
                }}
              >
                {option.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      removeOption(option.value, e);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => removeOption(option.value, e)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "relative flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none outline-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

