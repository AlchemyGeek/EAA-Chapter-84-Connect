import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Pencil, Save, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface EditableFieldDef {
  label: string;
  key: string;
  type?: "text" | "date";
}

function formatValue(value: any): string {
  if (value == null || value === "") return "—";
  return String(value);
}

interface EditableSectionProps {
  title: string;
  icon?: LucideIcon;
  fields: EditableFieldDef[];
  data: Record<string, any>;
  onSave: (updates: Record<string, any>) => Promise<void>;
  disabled?: boolean;
}

export function EditableSection({
  title,
  icon: Icon,
  fields,
  data,
  onSave,
  disabled = false,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});

  const startEdit = () => {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      init[f.key] = data[f.key] ?? "";
    });
    setDraft(init);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft({});
  };

  const save = async () => {
    setSaving(true);
    try {
      // Only send changed fields
      const updates: Record<string, any> = {};
      fields.forEach((f) => {
        const newVal = draft[f.key] === "" ? null : draft[f.key];
        const oldVal = data[f.key] ?? null;
        if (newVal !== oldVal) {
          updates[f.key] = newVal;
        }
      });
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={title} className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-secondary" />}
            {title}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {!editing ? (
            <div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm font-medium">{formatValue(data[f.key])}</dd>
                  </div>
                ))}
              </dl>
              {!disabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEdit}
                  className="mt-4 min-h-[44px]"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`edit-${f.key}`} className="text-xs text-muted-foreground">
                      {f.label}
                    </Label>
                    <Input
                      id={`edit-${f.key}`}
                      type={f.type === "date" ? "date" : "text"}
                      value={draft[f.key] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      className="mt-1"
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving}
                  className="min-h-[44px]"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancel}
                  disabled={saving}
                  className="min-h-[44px]"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
