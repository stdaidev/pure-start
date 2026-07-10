import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldRole } from "@/lib/contacts-parse";

const ROLES: { value: FieldRole; label: string }[] = [
  { value: "phone", label: "Telefone" },
  { value: "name", label: "Nome" },
  { value: "email", label: "Email" },
  { value: "tags", label: "Tags" },
  { value: "placeholder", label: "Placeholder" },
  { value: "ignorar", label: "Ignorar" },
];

export function MappingTable(props: {
  headers: string[];
  sample: Record<string, string>[];
  mapping: Record<string, FieldRole>;
  onChange: (header: string, role: FieldRole) => void;
}) {
  const { headers, sample, mapping, onChange } = props;
  return (
    <div className="overflow-auto rounded border border-border/60">
      <table className="w-full text-sm">
        <thead
          className="border-b border-border/60 bg-muted/30 text-left text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <tr>
            <th className="px-3 py-2">Coluna</th>
            <th className="px-3 py-2">Mapear para</th>
            <th className="px-3 py-2">Amostra</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((h) => (
            <tr key={h} className="border-b border-border/40">
              <td className="px-3 py-2 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                {h}
              </td>
              <td className="px-3 py-2">
                <Select
                  value={mapping[h] ?? "placeholder"}
                  onValueChange={(v) => onChange(h, v as FieldRole)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {sample
                  .slice(0, 3)
                  .map((r) => r[h] || "—")
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
