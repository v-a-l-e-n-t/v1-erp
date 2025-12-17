import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
    id: string;
    action: string;
    user_email: string;
    created_at: string;
    details: any;
}

interface AuditHistoryDialogProps {
    tableName: string;
    recordId: string;
    recordTitle?: string; // e.g. "Agent: Valentin"
    trigger?: React.ReactNode; // Custom trigger or default icon
}

export const AuditHistoryDialog = ({ tableName, recordId, recordTitle, trigger }: AuditHistoryDialogProps) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            loadLogs();
        }
    }, [open, tableName, recordId]);

    const loadLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('table_name', tableName)
            .eq('record_id', recordId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLogs(data);
        }
        setLoading(false);
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CREATE': return <Badge className="bg-green-500">Création</Badge>;
            case 'UPDATE': return <Badge className="bg-blue-500">Modification</Badge>;
            case 'DELETE': return <Badge className="bg-red-500">Suppression</Badge>;
            default: return <Badge variant="outline">{action}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" title="Historique des modifications">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md md:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Historique des modifications</DialogTitle>
                    <DialogDescription>
                        {recordTitle ? `Pour : ${recordTitle}` : 'Liste chronologique des actions.'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] w-full pr-4">
                    {loading ? (
                        <p className="text-center py-4 text-muted-foreground">Chargement...</p>
                    ) : logs.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground">Aucun historique trouvé.</p>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="flex flex-col gap-1 pb-3 border-b last:border-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(log.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                                        </span>
                                        {getActionBadge(log.action)}
                                    </div>
                                    <div className="flex items-center gap-1 font-medium text-sm">
                                        <span>Par:</span>
                                        <span className="text-primary">{log.user_email || 'Inconnu'}</span>
                                    </div>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <div className="text-xs bg-slate-50 p-2 rounded mt-1 overflow-x-auto">
                                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
