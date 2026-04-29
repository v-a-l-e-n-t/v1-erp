import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAppAuth } from '@/hooks/useAppAuth';

interface PasswordGateProps {
  onAuthenticated: () => void;
}

const PasswordGate = ({ onAuthenticated }: PasswordGateProps) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const { login, loading } = useAppAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(code);
    if (ok) {
      toast.success('Accès autorisé');
      onAuthenticated();
    } else {
      toast.error('Code incorrect');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">GazPILOTE Dashboard</CardTitle>
          <CardDescription>
            Veuillez entrer votre code d'accès personnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showCode ? 'text' : 'password'}
                placeholder="Code d'accès"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pr-10"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !code}>
              {loading ? 'Vérification...' : 'Accéder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordGate;
