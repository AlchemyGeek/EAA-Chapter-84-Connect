import type { LucideIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FieldDisplay {
  label: string;
  value: any;
}

function formatValue(value: any): string {
  if (value == null || value === "") return "—";
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value);
}

function FieldGrid({ fields }: { fields: FieldDisplay[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {fields.map((f) => (
        <div key={f.label}>
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="text-sm font-medium">{formatValue(f.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ReadOnlySectionProps {
  title: string;
  fields: FieldDisplay[];
  icon?: LucideIcon;
  defaultOpen?: boolean;
}

export function ReadOnlySection({
  title,
  fields,
  defaultOpen = false,
}: ReadOnlySectionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? title : undefined}
    >
      <AccordionItem value={title} className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">
          {title}
        </AccordionTrigger>
        <AccordionContent>
          <FieldGrid fields={fields} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
