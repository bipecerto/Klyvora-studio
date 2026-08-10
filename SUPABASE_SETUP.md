# Configuração do Supabase no Klyvora

Este documento descreve o passo a passo para conectar o Klyvora ao seu projeto no Supabase, aplicar as migrations de banco de dados e habilitar a autenticação real com profiles de usuário.

---

## 1. Variáveis de Ambiente (.env)

No painel de configurações ou no arquivo `.env` do seu projeto, adicione as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://sua-url-do-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

---

## 2. Aplicar a Migration SQL

Acesse o **SQL Editor** no painel do seu projeto Supabase e execute o conteúdo do arquivo localizado em `supabase/migrations/001_auth_profiles.sql`.

Esta migration inclui:
1. **Tabela `profiles`**:
   - `id` (UUID, chave primária vinculada a `auth.users(id)`)
   - `email` (TEXT)
   - `name` (TEXT)
   - `avatar_url` (TEXT)
   - `plan` (TEXT, valor padrão `'free'`)
   - `credits` (INTEGER, valor padrão `100`)
   - `created_at` e `updated_at` (TIMESTAMPTZ)

2. **Segurança por Linha (RLS - Row Level Security)**:
   - Ativada na tabela `profiles`.
   - Regras que garantem que cada usuário só pode visualizar, inserir e atualizar seu próprio perfil.

3. **Trigger Automático (`on_auth_user_created`)**:
   - Sempre que um novo usuário se cadastrar via e-mail ou Google na tabela `auth.users`, a função `handle_new_user()` cria automaticamente uma linha correspondente na tabela `public.profiles` com o nome completo e e-mail informados.

---

## 3. Funcionalidades de Autenticação Ativas

- **Cadastro de E-mail (`/register`)**: Cria usuário no Supabase e aciona o trigger de perfil.
- **Login com E-mail (`/login`)**: Autentica e inicia sessão no Supabase.
- **Recuperação de Senha**: Envia e-mail de redefinição de senha através do Supabase Auth.
- **Logout**: Encerra a sessão e redireciona para a página de login.
- **Sessão Persistente**: A sessão é mantida no armazenamento do navegador através do cliente oficial `@supabase/supabase-js`.
- **Rotas Protegidas (`ProtectedRoute`)**: As rotas internas (`/dashboard`, `/series`, `/videos`, `/library`, `/settings`) exigem que o usuário esteja autenticado. Caso contrário, ele é redirecionado para `/login`.
- **Nome e Perfil Real**: O Dashboard e a Sidebar exibem em tempo real o nome do usuário cadastrado, seu e-mail e saldo de créditos.
