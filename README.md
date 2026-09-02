# 📦 Treina in Box

Plataforma web de cursos online (treinamentos corporativos) construída com **React** e **Supabase**, onde professores e alunos interagem em um mesmo ambiente: conteúdo de aula, chat da turma e aulas ao vivo agendadas via link do Google Meet.

> Projeto iniciado por um cliente sem experiência em desenvolvimento (usando a plataforma no-code **Lovable**) e assumido e evoluído como desenvolvedor, migrando a base para um fluxo de desenvolvimento tradicional em React + Supabase.

---

## Funcionalidades

- **Conteúdo da aula** — cada treinamento tem uma área de conteúdo com o material disponibilizado pelo professor.
- **Praça / Chat da turma** — espaço de interação em tempo real entre os alunos matriculados no mesmo treinamento.
- **Aulas ao vivo** — o professor cadastra a aula informando o link do Google Meet, que fica disponível para os alunos daquele treinamento.
- **Autenticação de usuários** — cadastro/login por e-mail e senha, login social com Google, recuperação de senha.
- **Perfis e permissões** — áreas distintas para aluno e administrador/professor (rotas protegidas).
- **Meu espaço** — área pessoal do aluno dentro de cada treinamento.

---

## Tecnologias

O projeto é construído com uma stack moderna de front-end desacoplada de um back-end como serviço:

- **[React](https://react.dev/)** + **TypeScript** — biblioteca principal da interface, com tipagem estática.
- **[Vite](https://vitejs.dev/)** — build tool e servidor de desenvolvimento.
- **[Supabase](https://supabase.com/)** — back-end como serviço, usado para:
  - **Autenticação** (e-mail/senha, OAuth Google, reset de senha);
  - **Banco de dados PostgreSQL** (treinamentos, conteúdos, mensagens, perfis, etc.);
  - **Realtime**, para o chat entre alunos.
- **Tailwind CSS** + **shadcn/ui** — estilização utilitária e biblioteca de componentes acessíveis.
- **React Router DOM** — roteamento entre páginas e rotas protegidas.
- **TanStack Query (React Query)** — gerenciamento de estado assíncrono e cache de dados.
- **React Hook Form** + **Zod** — formulários com validação.
- **Tiptap** — editor de texto rico usado na criação/edição de conteúdo das aulas.
- **Vitest** + **Testing Library** — testes automatizados.
---

## 🚀 Rodando o projeto localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ (recomendado via [nvm](https://github.com/nvm-sh/nvm))
- Uma conta e um projeto criado no [Supabase](https://supabase.com/)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/GuilhermeSMaia/treina-in-box-main.git

# 2. Entre na pasta do projeto
cd treina-in-box-main

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente (veja seção abaixo)
cp .env.example .env

# 5. Rode o servidor de desenvolvimento
npm run dev
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as chaves do seu projeto Supabase (disponíveis em *Project Settings → API*):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-anon
```

### Scripts disponíveis

| Comando            | Descrição                                   |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Inicia o servidor de desenvolvimento         |
| `npm run build`     | Gera a build de produção                     |
| `npm run preview`   | Pré-visualiza a build de produção localmente |
| `npm run lint`      | Roda o linter (ESLint)                       |
| `npm run test`      | Executa os testes                            |
| `npm run test:watch`| Executa os testes em modo watch              |

---

## 🗄️ Banco de dados (Supabase)

A pasta `supabase/` contém as migrations do banco. Caso esteja subindo um projeto Supabase novo, aplique as migrations com a [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref SEU-PROJECT-REF
supabase db push
```

---

## 🧭 Roadmap / próximos passos

- [ ] Remover completamente as dependências residuais do Lovable (ver seção abaixo)
- [ ] Documentar o schema do banco (tabelas e políticas de RLS)
- [ ] Adicionar CI para lint/test em pull requests
- [ ] Deploy automatizado

---

## 📌 Sobre a origem do projeto

Este projeto foi iniciado com o auxílio da plataforma **Lovable** por um cliente sem experiência técnica, como forma de validar a ideia rapidamente. A partir de um certo ponto, o desenvolvimento passou a ser conduzido por mim de forma manual, mantendo React + Supabase como base e removendo gradualmente as dependências específicas do Lovable (autenticação social, tooling de desenvolvimento e metadados), para que o projeto funcione de forma independente de qualquer plataforma no-code.

---

## 📄 Licença

Defina aqui a licença do projeto (ex.: MIT) ou remova esta seção caso o projeto seja privado/proprietário.
