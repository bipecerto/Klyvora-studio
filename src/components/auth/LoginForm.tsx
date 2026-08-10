import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { KlyvoraLogo } from '../ui/KlyvoraLogo';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';

interface AuthFormProps {
  onNavigate: (path: string) => void;
}

export const LoginForm: React.FC<AuthFormProps> = ({ onNavigate }) => {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await signInWithEmail(email, password);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      onNavigate('/dashboard');
    }
  };

  return (
    <Card className="w-full max-w-md bg-[#111116] border-[#27272F] klyvora-glow-sm">
      <CardHeader className="text-center pb-2 border-none">
        <div className="flex justify-center mb-4">
          <KlyvoraLogo size="lg" iconOnly />
        </div>
        <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
        <CardDescription>Acesse sua conta Klyvora para gerenciar suas séries de vídeos em IA</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#18181F] hover:bg-[#27272F] text-[#F7F7F8] font-medium text-sm rounded-xl border border-[#27272F] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continuar com Google
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#27272F] w-full" />
          <span className="bg-[#111116] px-3 text-[11px] text-[#A1A1AA] uppercase tracking-wider font-medium">OU COM E-MAIL</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Endereço de E-mail"
            type="email"
            placeholder="seu@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
                Senha
              </label>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="text-xs text-[#A78BFA] hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={loading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-[#A1A1AA] pt-2">
          Não tem uma conta?{' '}
          <button
            onClick={() => onNavigate('/register')}
            className="text-[#A78BFA] font-semibold hover:underline"
          >
            Criar conta
          </button>
        </p>
      </CardContent>
    </Card>
  );
};

export const RegisterForm: React.FC<AuthFormProps> = ({ onNavigate }) => {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await signUpWithEmail(email, password, name);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      onNavigate('/dashboard');
    }
  };

  return (
    <Card className="w-full max-w-md bg-[#111116] border-[#27272F] klyvora-glow-sm">
      <CardHeader className="text-center pb-2 border-none">
        <div className="flex justify-center mb-4">
          <KlyvoraLogo size="lg" iconOnly />
        </div>
        <CardTitle className="text-2xl font-bold">Crie sua conta</CardTitle>
        <CardDescription>Comece a criar séries de vídeos curtos automatizadas em minutos</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#18181F] hover:bg-[#27272F] text-[#F7F7F8] font-medium text-sm rounded-xl border border-[#27272F] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Cadastrar com Google
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#27272F] w-full" />
          <span className="bg-[#111116] px-3 text-[11px] text-[#A1A1AA] uppercase tracking-wider font-medium">OU COM E-MAIL</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome Completo"
            type="text"
            placeholder="Alex Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<UserIcon className="w-4 h-4" />}
            required
          />

          <Input
            label="Endereço de E-mail"
            type="email"
            placeholder="seu@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Mínimo de 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={loading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Criar Conta Gratuita
          </Button>
        </form>

        <p className="text-center text-xs text-[#A1A1AA] pt-2">
          Já possui uma conta?{' '}
          <button
            onClick={() => onNavigate('/login')}
            className="text-[#A78BFA] font-semibold hover:underline"
          >
            Entrar
          </button>
        </p>
      </CardContent>
    </Card>
  );
};

export const ForgotPasswordForm: React.FC<AuthFormProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe o seu endereço de e-mail.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <Card className="w-full max-w-md bg-[#111116] border-[#27272F] klyvora-glow-sm">
      <CardHeader className="text-center pb-2 border-none">
        <div className="flex justify-center mb-4">
          <KlyvoraLogo size="lg" iconOnly />
        </div>
        <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
        <CardDescription>Digite o e-mail cadastrado para receber as instruções de redefinição</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {success ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <p className="text-sm font-semibold text-emerald-400">E-mail de redefinição enviado!</p>
            <p className="text-xs text-[#A1A1AA]">Verifique sua caixa de entrada em {email} para mais instruções.</p>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('/login')}>
              Voltar para Entrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                {error}
              </div>
            )}
            <Input
              label="Endereço de E-mail"
              type="email"
              placeholder="seu@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
              Enviar Link de Redefinição
            </Button>
            <p className="text-center text-xs text-[#A1A1AA]">
              Lembrou da senha?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-[#A78BFA] font-semibold hover:underline"
              >
                Entrar
              </button>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
