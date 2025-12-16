import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Key, Loader2, Check, User, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VracClient } from '@/types/vrac';
import { generateVracPassword, hashPassword } from '@/hooks/useVracAuth';
import { useToast } from '@/hooks/use-toast';

const VracPasswordGenerator: React.FC = () => {
    const [clients, setClients] = useState<VracClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [userName, setUserName] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        const { data, error } = await supabase
            .from('vrac_clients')
            .select('*')
            .eq('actif', true)
            .order('nom_affichage');

        if (!error && data) {
            setClients(data);
        }
    };

    const handleGenerate = async () => {
        if (!selectedClientId) {
            toast({
                title: 'Erreur',
                description: 'Veuillez sélectionner un client',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            const password = generateVracPassword();
            const passwordHash = await hashPassword(password);

            const { error } = await supabase.from('vrac_users').insert({
                client_id: selectedClientId,
                nom: userName.trim() || null,
                password_hash: passwordHash,
                actif: true,
            });

            if (error) {
                throw error;
            }

            setGeneratedPassword(password);
            toast({
                title: 'Mot de passe généré',
                description: 'Le mot de passe a été créé avec succès',
            });
        } catch (error) {
            console.error('Error generating password:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de générer le mot de passe',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        toast({
            title: 'Copié !',
            description: 'Mot de passe copié dans le presse-papier',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setGeneratedPassword('');
        setUserName('');
        setSelectedClientId('');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    Générer un mot de passe client
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!generatedPassword ? (
                    <>
                        {/* Client Selection */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Client VRAC
                            </Label>
                            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.nom_affichage}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* User Name (optional) */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Nom de l'utilisateur <span className="text-muted-foreground font-normal">(optionnel)</span>
                            </Label>
                            <Input
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={loading || !selectedClientId}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <Key className="w-4 h-4 mr-2" />
                                    Générer le mot de passe
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                            <p className="text-sm text-emerald-700 mb-2 font-medium">Mot de passe généré avec succès</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-4 py-3 bg-white border border-border rounded-lg text-2xl font-mono text-center tracking-wider text-foreground shadow-sm">
                                    {generatedPassword}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopy}
                                    className="h-12 w-12"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-sm text-amber-800">
                                ⚠️ Notez ce mot de passe et communiquez-le au client. Il ne sera plus visible après cette page.
                            </p>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="w-full"
                        >
                            Générer un autre mot de passe
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default VracPasswordGenerator;
