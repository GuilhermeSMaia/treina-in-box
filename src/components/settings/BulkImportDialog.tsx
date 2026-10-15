import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainings } from "@/hooks/useTrainings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/feedback/notify";
import { Upload, FileText, CheckCircle2, AlertCircle, MessageCircle, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/settings/TablePagination";

interface ParsedRow {
  nome: string;
  telefone: string;
  email: string;
  valid: boolean;
  errors: string[];
  duplicate: boolean;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detect separator
  const headerLine = lines[0];
  const separator = headerLine.includes(";") ? ";" : ",";

  const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const nomeIdx = headers.findIndex((h) => ["nome", "name"].includes(h));
  const telIdx = headers.findIndex((h) => ["telefone", "phone", "tel", "whatsapp", "celular"].includes(h));
  const emailIdx = headers.findIndex((h) => ["email", "e-mail"].includes(h));

  if (telIdx === -1) {
    // Try positional: nome, telefone, email
    return lines.slice(1).filter(Boolean).map((line) => {
      const cols = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      return buildRow(cols[0] ?? "", cols[1] ?? "", cols[2] ?? "");
    });
  }

  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    return buildRow(
      nomeIdx >= 0 ? cols[nomeIdx] ?? "" : "",
      cols[telIdx] ?? "",
      emailIdx >= 0 ? cols[emailIdx] ?? "" : ""
    );
  });
}

function buildRow(nome: string, telefone: string, email: string): ParsedRow {
  const errors: string[] = [];
  const cleanPhone = telefone.replace(/\D/g, "");

  if (!cleanPhone) {
    errors.push("Telefone obrigatório");
  } else if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    errors.push("Telefone inválido");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email inválido");
  }

  return {
    nome,
    telefone: cleanPhone,
    email: email.trim().toLowerCase(),
    valid: errors.length === 0,
    errors,
    duplicate: false,
  };
}

function markDuplicates(rows: ParsedRow[]): ParsedRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (!row.telefone) return row;
    const dup = seen.has(row.telefone);
    seen.add(row.telefone);
    if (dup) {
      return { ...row, duplicate: true, valid: false, errors: [...row.errors, "Telefone duplicado"] };
    }
    return row;
  });
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: trainings = [] } = useTrainings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [trainingId, setTrainingId] = useState("");
  const [classId, setClassId] = useState("");
  const [fileName, setFileName] = useState("");
  const [showWhatsAppLinks, setShowWhatsAppLinks] = useState(false);
  const [importedPhones, setImportedPhones] = useState<{ phone: string; token: string }[]>([]);

  // Fetch classes for selected training
  const selectedTraining = trainings.find((t) => t.id === trainingId);

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  
  // Load classes when training changes
  const loadClasses = async (tid: string) => {
    if (!tid || tid === "none") {
      setClasses([]);
      setClassId("");
      return;
    }
    try {
      const { data } = await supabase.from("classes").select("id, name").eq("training_id", tid);
      setClasses(data ?? []);
    } catch {
      setClasses([]);
    }
  };

  const validRows = useMemo(() => rows.filter((r) => r.valid), [rows]);

  const pagination = useTablePagination(rows, 10);
  const { paginatedItems: paginatedRows, currentPage, resetPage } = pagination;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setShowWhatsAppLinks(false);
    setImportedPhones([]);
    resetPage();

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(markDuplicates(parsed));
    };
    reader.readAsText(file, "UTF-8");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      const ts = Date.now();

      const payloads = validRows.map((row, i) => ({
        channel: "whatsapp" as const,
        phone: row.telefone,
        email: row.email || `import-${ts}-${i}@invite`,
        role: "student" as const,
        training_id: trainingId && trainingId !== "none" ? trainingId : null,
        class_id: classId && classId !== "none" ? classId : null,
        invited_by: user.id,
      }));

      const { data, error } = await supabase.from("invitations").insert(payloads as any).select("phone, invite_token");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      notify.success("Importação concluída", `${data.length} convite(s) criado(s) com sucesso.`);
      setImportedPhones(data.map((d: any) => ({ phone: d.phone, token: d.invite_token })));
      setShowWhatsAppLinks(true);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (err: Error) => notify.error("Erro na importação", err.message),
  });

  const appUrl = window.location.origin;

  const openWhatsApp = (phone: string, token: string) => {
    const link = `${appUrl}/?invite=${token}`;
    const msg = encodeURIComponent(`Você foi convidado para participar do treinamento na Treina in Box! Acesse: ${link}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setShowWhatsAppLinks(false);
    setImportedPhones([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Lista de Alunos</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com colunas: <strong>nome</strong> (opcional), <strong>telefone</strong> (obrigatório), <strong>email</strong> (opcional).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Upload area */}
          {rows.length === 0 && !showWhatsAppLinks && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para selecionar um arquivo CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Separadores aceitos: vírgula (,) ou ponto-e-vírgula (;)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {/* File info + selectors */}
          {rows.length > 0 && !showWhatsAppLinks && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-muted-foreground">
                    — {rows.length} linha(s), {validRows.length} válida(s)
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>Trocar arquivo</Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Treinamento</Label>
                  <Select value={trainingId} onValueChange={(v) => { setTrainingId(v); loadClasses(v); }}>
                    <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {trainings.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Turma</Label>
                  <Select value={classId} onValueChange={setClassId} disabled={classes.length === 0}>
                    <SelectTrigger><SelectValue placeholder={classes.length === 0 ? "Selecione um treinamento" : "Selecionar turma"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview table */}
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((row, i) => {
                      const globalIndex = (currentPage - 1) * 10 + i;
                      return (
                        <TableRow key={globalIndex} className={!row.valid ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{globalIndex + 1}</TableCell>
                          <TableCell className="text-sm">{row.nome || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{row.telefone || "—"}</TableCell>
                          <TableCell className="text-sm">{row.email || "—"}</TableCell>
                          <TableCell>
                            {row.valid ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" /> OK
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" /> {row.errors[0]}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <TablePagination pagination={pagination} />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={validRows.length === 0 || importMutation.isPending}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {validRows.length} aluno(s)
                </Button>
              </div>
            </>
          )}

          {/* WhatsApp links after import */}
          {showWhatsAppLinks && importedPhones.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 inline mr-1 text-primary" />
                {importedPhones.length} convite(s) criado(s). Envie via WhatsApp:
              </div>
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 space-y-1">
                  {importedPhones.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <span className="font-mono text-sm">{item.phone}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWhatsApp(item.phone, item.token)}
                        className="gap-1.5"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Enviar
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end pt-2">
                <Button onClick={() => handleClose(false)}>Fechar</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
