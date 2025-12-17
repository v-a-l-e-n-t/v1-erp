import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AuditLogAction {
    table_name: string;
    record_id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    details?: any;
}

export const useAudit = () => {
    const logAction = async ({ table_name, record_id, action, details }: AuditLogAction) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Fallback pour l'authentification propriétaire (localStorage)
            const localUser = localStorage.getItem('user_name');
            const userEmailOrName = user?.email || localUser;

            if (!user && !localUser) {
                console.warn('Traceability: No active session. Audit log skipped for', action, table_name);
                return;
            }

            const payload = {
                table_name,
                record_id,
                action,
                user_id: user?.id || null, // Supabase Auth ID or null
                user_email: userEmailOrName, // Email or Name
                details
            };

            const { error } = await supabase.from('audit_logs').insert(payload);

            if (error) {
                console.error('Error logging action:', error);
            } else {
                console.log('Audit log created:', action, table_name);
            }
        } catch (err) {
            console.error('Failed to log audit action:', err);
        }
    };

    return { logAction };
};
