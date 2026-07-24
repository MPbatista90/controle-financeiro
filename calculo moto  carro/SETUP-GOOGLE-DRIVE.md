# Configuração do Google Drive API - Guia Completo

Este guia ensina como configurar o Google Cloud Console para usar a sincronização do Google Drive no **Controle da Moto**.

---

## 1. Criar um Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Clique no seletor de projetos (canto superior esquerdo) → **Novo Projeto**
3. Nome do projeto: `Controle da Moto` (ou o nome que preferir)
4. Organização/Local: selecione sua organização ou "Sem organização"
5. Clique em **Criar**
6. Aguarde a criação e clique na notificação para selecionar o projeto

---

## 2. Ativar a Google Drive API

1. No menu lateral: **APIs e Serviços** → **Biblioteca**
2. Na busca, digite: `Google Drive API`
3. Clique no resultado **Google Drive API**
4. Clique em **Ativar**
5. Aguarde a ativação concluída

---

## 3. Configurar a Tela de Consentimento OAuth

1. No menu lateral: **APIs e Serviços** → **Tela de consentimento OAuth**
2. Tipo de usuário: **Externo** (padrão, para usuários com conta Google pessoal)
3. Clique em **Criar**
4. Preencha os campos obrigatórios:
   - **Nome do aplicativo**: `Controle da Moto`
   - **E-mail de suporte do usuário**: seu e-mail
   - **Logotipo do aplicativo**: (opcional)
   - **Domínios autorizados**: deixe vazio por enquanto
   - **E-mail de contato do desenvolvedor**: seu e-mail
5. Clique em **Salvar e continuar**
6. **Escopos** (opcional): clique em **Adicionar ou remover escopos** → busque por `drive.file` e `drive.appdata` → marque ambos → **Atualizar** → **Salvar e continuar**
7. **Usuários de teste**: clique em **Adicionar usuários** → adicione seu e-mail Google (o mesmo que usará para testar) → **Salvar e continuar**
8. Revise o resumo → **Voltar ao painel**

---

## 4. Criar OAuth Client ID (Web Application)

1. No menu lateral: **APIs e Serviços** → **Credenciais**
2. Clique em **+ Criar credenciais** → **ID do cliente OAuth**
3. Tipo de aplicativo: **Aplicativo da Web**
4. Nome: `Controle da Moto Web`
5. **Origens JavaScript autorizadas** (adicionar todas que usar):
   ```
   http://localhost:8080
   http://localhost:8000
   http://192.168.15.6:8080
   http://192.168.15.6:8000
   https://seu-usuario.github.io
   https://seu-app.netlify.app
   https://seu-app.vercel.app
   ```
   > **Importante**: Adicione **todos** os domínios/portas que usará. Para testar localmente, inclua `http://localhost:8080` e o IP da sua rede local (ex: `http://192.168.15.6:8080`).
6. **URIs de redirecionamento autorizados** (opcional para este app):
   - Como usamos o fluxo *token client* (GSI), **não é necessário** adicionar URIs de redirecionamento
   - Deixe vazio ou adicione a URL base se preferir
7. Clique em **Criar**
8. **Copie o ID do cliente** (Client ID) — formato: `123456789-abc123.apps.googleusercontent.com`
9. (Opcional) Copie também o **Segredo do cliente** se for usar backend — **não necessário aqui**

---

## 5. (Opcional) Criar uma API Key

> **Não é obrigatório** para o funcionamento básico, mas recomendado se for usar a API do Google Drive diretamente via `gapi.client`.

1. Em **Credenciais**, clique em **+ Criar credenciais** → **Chave de API**
2. Copie a chave gerada (formato: `AIzaSy...`)
3. **Restringir chave** (recomendado):
   - Clique na chave criada
   - **Restrições de aplicativo**: **Referrers HTTP (sites)**
   - Adicione os mesmos domínios das Origens JavaScript
   - **Restrições de API**: **Restringir chave** → selecione **Google Drive API**
   - Salve

---

## 6. Configurar no Projeto

Abra o arquivo **`js/config.js`** e preencha:

```javascript
const CONFIG = {
  // Cole seu Client ID aqui (formato: 123456789-abc123.apps.googleusercontent.com)
  GOOGLE_CLIENT_ID: 'SEU_CLIENT_ID_AQUI',

  // Cole sua API Key aqui (opcional, formato: AIzaSy...)
  GOOGLE_API_KEY: 'SUA_API_KEY_AQUI',

  GOOGLE_SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',

  BACKUP_FILE_NAME: 'moto_data_backup.json',
  DRIVE_FOLDER_NAME: 'Controle da Moto'
};
```

**Não comite credenciais reais no Git!** O arquivo `js/config.js` deve estar no `.gitignore`.

---

## 7. Testar a Sincronização

### Teste Local

1. Inicie o servidor local:
   ```bash
   cd "C:\Users\tukom\Desktop\TESTE OPENCODE IA\calculo moto  carro"
   python -m http.server 8080
   ```

2. No celular (mesma rede Wi-Fi), acesse:
   ```
   http://SEU_IP_LOCAL:8080
   ```
   Exemplo: `http://192.168.15.6:8080`

3. Abra a página **Sincronizar** (ícone de nuvem no menu)

4. Clique em **Conectar Google Drive**

5. Escolha sua conta Google (deve ser uma das usuárias de teste adicionadas no passo 3)

6. Autorize o acesso ao Google Drive

6. Deve aparecer: **"Conectado ao Google Drive"** com status **"Sincronizado"**

### Verificar se funcionou

1. Faça um abastecimento na página **Abastecimentos**
2. Clique em **Sincronizar Agora**
3. Acesse https://drive.google.com no PC
4. Procure a pasta **"Controle da Moto"**
5. Deve existir o arquivo `moto_data_backup.json`

### Testar Restauração

1. Limpe os dados locais (página **Exportar** → **Zerar Todos os Dados**)
2. Recarregue a página
3. Vá em **Sincronizar** → **Restaurar do Drive**
4. Os dados devem voltar

---

## 8. Publicar Online (GitHub Pages / Netlify / Vercel)

### GitHub Pages

1. Crie um repositório no GitHub
2. Faça push do código (sem o `js/config.js` real — use `.env.example` ou variáveis de ambiente do provedor)
3. Settings → Pages → Deploy from branch → `main` / `root`
4. Adicione a URL do GitHub Pages nas **Origens JavaScript autorizadas** no Cloud Console

### Netlify

1. Arraste a pasta do projeto para https://app.netlify.com
2. Site settings → Environment variables:
   - `GOOGLE_CLIENT_ID` = seu Client ID
   - `GOOGLE_API_KEY` = sua API Key (opcional)
3. Modifique `js/config.js` para ler de `import.meta.env` ou use um script de build

### Vercel

1. `npm i -g vercel` → `vercel` na pasta do projeto
2. Settings → Environment Variables
3. Adicione as variáveis
4. Configure o build para injetar no `config.js`

---

## Solução de Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| "Erro de autenticação: access_denied" | Usuário não está na lista de teste | Adicione o e-mail em **Tela de consentimento → Usuários de teste** |
| "Erro de autenticação: invalid_client" | Client ID errado ou origem não autorizada | Verifique `GOOGLE_CLIENT_ID` em `config.js` e Origens no Cloud Console |
| "Erro: 403 Forbidden" | API Drive não ativada | Ative **Google Drive API** no Cloud Console |
| "Falha ao carregar Google API" | Bloqueador de anúncios / rede | Desative bloqueador, verifique conexão |
| Sincroniza mas não aparece no Drive | Pasta não criada | Clique "Sincronizar Agora" novamente; a pasta é criada automaticamente |
| "Token revogado" ao recarregar | Token expirado/revogado | Clique em "Desconectar" e conecte novamente |

---

## Segurança

- **Nunca** commite `js/config.js` com credenciais reais
- Use `.gitignore`:
  ```
  js/config.js
  ```
- Em produção, use variáveis de ambiente do provedor (Netlify, Vercel, GitHub Pages Actions)
- O escopo `drive.file` só dá acesso aos arquivos criados pelo app — não acessa todo o Drive do usuário

---

## Referências

- [Google Identity Services (GSI) - Guia oficial](https://developers.google.com/identity/gsi/web)
- [Google Drive API v3 - Referência](https://developers.google.com/drive/api/v3/reference)
- [OAuth 2.0 para Apps Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Escopos do Google Drive](https://developers.google.com/drive/api/guides/api-specific-auth)

---

*Última atualização: 2025*