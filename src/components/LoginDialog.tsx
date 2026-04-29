import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
    const [code, setCode] = useState("");
    const navigate = useNavigate();
    const { login, loading } = useAppAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await login(code);
        if (ok) {
            toast.success(`Bienvenue`);
            onOpenChange(false);
            navigate("/dashboard");
        } else {
            toast.error("Code incorrect");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Connexion GazPILOTE
                    </DialogTitle>
                    <DialogDescription>
                        Veuillez entrer votre code d'accès personnel pour accéder au tableau de bord.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Code d'accès</Label>
                        <Input
                            id="code"
                            type="password"
                            placeholder="••••••••"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={loading || !code}>
                            {loading ? "Vérification..." : "Se connecter"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default LoginDialog;
