# Agenda Barber — SaaS de agendamento (Next.js + Supabase)

## 1. Instalar
    npm install && cp .env.example .env.local   # preencha as 3 variáveis

## 2. Banco
Supabase > SQL Editor > cole `supabase/schema.sql` > Run.

## 3. Primeiro cliente (barbearia)
1. Supabase > Authentication > Users > **Add user** (e-mail + senha do barbeiro). Copie o UUID.
2. No SQL Editor (troque os valores):

       insert into establishments(owner_id,name,slug,whatsapp,address)
       values('UUID_DO_USUARIO','Barbearia do Zé','barbearia-do-ze','5599999999999','Rua X, 100');
       -- depois: insert em professionals, services e availability (ou use o painel /admin para serviços e horários)

3. Cliente agenda em `/barbearia-do-ze`; o barbeiro entra em `/admin`.
Para vender: repita o passo 3 para cada novo cliente (um usuário + um estabelecimento).

## 4. Deploy (Vercel)
Suba o projeto no GitHub > vercel.com/new > importe > em *Environment Variables* adicione as 3 variáveis do `.env.example` > Deploy.
`SUPABASE_SERVICE_ROLE_KEY` nunca deve ter prefixo `NEXT_PUBLIC_`.

## 5. Próximos passos
- Lembrete automático: Vercel Cron chamando uma rota que envia pelo WhatsApp Cloud API (ou Z-API/Evolution) 1 dia antes.
- Cobrança de assinatura (Stripe/Mercado Pago/Asaas) e tela de cadastro de novos clientes.
