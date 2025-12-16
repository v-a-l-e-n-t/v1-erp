import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const USERS_MAP: Record<string, string> = {
    "@k@2626": "JEAN PASCAL TANO",
    "VAL@2026": "VALENT SANLE",
    "Admin@2026": "BABA JACQUES"
};

const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // Check if password exists in map
        const userName = USERS_MAP[password];

        if (userName) {
            // Success
            localStorage.setItem("user_name", userName);
            localStorage.setItem("isAuthenticated", "true");
            toast.success(`Bienvenue, ${userName}`);
            navigate("/dashboard");
        } else {
            // Failure
            toast.error("Mot de passe incorrect");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Connexion GazPILOT
                    </DialogTitle>
                    <DialogDescription>
                        Veuillez entrer votre code d'accès personnel pour accéder au tableau de bord.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Code d'accès</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full">
                            Se connecter
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default LoginDialog;
