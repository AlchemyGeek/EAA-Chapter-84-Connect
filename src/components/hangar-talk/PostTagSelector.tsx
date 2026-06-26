import { TagAutocomplete } from "./TagAutocomplete";

export function PostTagSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <TagAutocomplete
      selected={selected}
      onChange={onChange}
      placeholder="Add tags (e.g. building, taildragger, IFR)…"
      maxTags={8}
    />
  );
}
