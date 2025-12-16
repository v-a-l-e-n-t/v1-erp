import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Loader2 } from 'lucide-react';
import { useVracAuth } from '@/hooks/useVracAuth';

interface VracLoginFormProps {
    onLoginSuccess?: () => void;
}

const VracLoginForm: React.FC<VracLoginFormProps> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const { login, loading, error } = useVracAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;

        const success = await login(password);
        if (success && onLoginSuccess) {
            onLoginSuccess();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                        Espace Client VRAC
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Entrez votre mot de passe pour accéder à votre espace
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">
                                Mot de passe
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Entrez votre mot de passe"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || !password.trim()}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold py-2.5 transition-all duration-200 shadow-lg shadow-orange-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Connexion...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-500">
                            Contactez votre administrateur si vous avez oublié votre mot de passe
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VracLoginForm;
