import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EditableContact {
  id: string;
  name: string | null;
  tags: string[];
}

export function ContactEditDialog(props: {
  open: boolean;
  contact: EditableContact | null;
  onClose: () => void;
  onSave: (v: { id: string; name: string | null; tags: string[] }) => void;
  saving?: boolean;
}) {
  const { open, contact, onClose, onSave, saving } = props;
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (contact) {
      setName(contact.name ?? "");
      setTags((contact.tags ?? []).join(", "));
    }
  }, [contact]);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar contato</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="contact-name">Nome</Label>
            <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="contact-tags">Tags (separadas por virgula)</Label>
            <Input id="contact-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!contact || saving}
            onClick={() => {
              if (!contact) return;
              onSave({
                id: contact.id,
                name: name.trim() ? name.trim() : null,
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              });
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
