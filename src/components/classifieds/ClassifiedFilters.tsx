import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { CATEGORY_OPTIONS, type Category, type Tag } from "@/lib/classifieds/types";
import { isFilterActive, type FilterState } from "@/lib/classifieds/filters";
import { useState } from "react";

interface Props {
  value: FilterState;
  onChange: (v: FilterState) => void;
  onClear: () => void;
  /** Tags currently in use across visible listings — used as filter suggestions. */
  availableTags: Tag[];
}

function TagChips({
  tags,
  selected,
  onToggle,
}: {
  tags: Tag[];
  selected: Tag[];
  onToggle: (t: Tag) => void;
}) {
  if (!tags.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No tags yet. They'll appear here as members add them.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const active = selected.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => onToggle(t)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export function ClassifiedFilters({ value, onChange, onClear, availableTags }: Props) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleTag = (t: Tag) => {
    const next = value.tags.includes(t) ? value.tags.filter((x) => x !== t) : [...value.tags, t];
    onChange({ ...value, tags: next });
  };

  const setCategory = (c: Category | "all") => onChange({ ...value, category: c });

  const active = isFilterActive(value);
  const activeCount =
    (value.search ? 1 : 0) + (value.category !== "all" ? 1 : 0) + value.tags.length;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search listings..."
          className="pl-9"
        />
      </div>

      {isMobile ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={value.category} onValueChange={(v) => setCategory(v as Category | "all")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <TagChips tags={availableTags} selected={value.tags} onToggle={toggleTag} />
              </div>
              {active && (
                <Button variant="ghost" onClick={onClear} className="w-full">
                  <X className="h-4 w-4" /> Clear all filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <>
          <Select value={value.category} onValueChange={(v) => setCategory(v as Category | "all")}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableTags.length > 0 && (
            <Select
              value="__placeholder__"
              onValueChange={(v) => {
                if (v && v !== "__placeholder__") toggleTag(v as Tag);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={value.tags.length ? `${value.tags.length} tag${value.tags.length === 1 ? "" : "s"}` : "Tags"} />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {value.tags.includes(t) ? "✓ " : ""}
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {active && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </>
      )}
    </div>
  );
}
