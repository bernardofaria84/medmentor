# 📱 Deploy Mobile App - Google Play Store

## Visão Geral

Guia completo para publicar o app MedMentor na Google Play Store usando Expo.

---

## Pré-requisitos

- ✅ Conta Google Play Developer ($25 taxa única)
- ✅ Conta Expo (gratuita)
- ✅ Node.js 18+ instalado
- ✅ Git instalado
- ✅ Código do projeto clonado localmente

---

## Passo 1: Criar Conta Google Play Developer

1. Acesse: https://play.google.com/console/signup
2. Pague taxa de $25 (uma vez)
3. Complete seu perfil de desenvolvedor
4. Aceite termos e condições

---

## Passo 2: Preparar Assets

### Ícones e Splash Screen

**Ícone do App** (icon.png):
- Tamanho: 1024x1024px
- Formato: PNG com transparência
- Local: `/frontend/assets/images/icon.png`

**Adaptive Icon** (Android):
- Tamanho: 1024x1024px
- Local: `/frontend/assets/images/adaptive-icon.png`

**Splash Screen**:
- Tamanho: 1242x2436px ou maior
- Local: `/frontend/assets/images/splash-icon.png`

### Screenshots para Store

**Obrigatório**:
- Mínimo 2 screenshots
- Tamanho: 1080x1920px (portrait)
- Capture telas principais do app

**Recomendado**: Capturar 5-8 screenshots:
1. Tela de login
2. Lista de mentores
3. Chat em ação
4. Histórico de conversas
5. Perfil do usuário

---

## Passo 3: Configurar app.json

```bash
cd frontend
nano app.json
```

**Configurações importantes**:
```json
{
  "expo": {
    "name": "MedMentor",
    "slug": "medmentor",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "medmentor",
    "android": {
      "package": "com.medmentor.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#2563eb"
      },
      "permissions": [
        "INTERNET",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## Passo 4: Instalar EAS CLI

```bash
# Instalar globalmente
npm install -g eas-cli

# Verificar instalação
eas --version
```

---

## Passo 5: Login no Expo

```bash
# Login
eas login

# Verificar usuário
eas whoami
```

---

## Passo 6: Configurar EAS Build

```bash
cd frontend

# Configurar EAS
eas build:configure
```

Isso criará `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Passo 7: Build para Produção

### Build Android App Bundle (AAB)

```bash
cd frontend

# Build produção
eas build --platform android --profile production

# Aguarde ~10-20 minutos
# O build é feito na nuvem Expo
```

**O que acontece**:
1. Código enviado para servidores Expo
2. Build executado na nuvem
3. AAB gerado e disponibilizado
4. Link para download fornecido

### Build APK (Para testes)

```bash
eas build --platform android --profile preview
```

APK pode ser instalado diretamente em dispositivos.

---

## Passo 8: Baixar o Build

```bash
# Listar builds
eas build:list

# Baixar via CLI
eas build:download --platform android

# Ou baixar via dashboard
# https://expo.dev/accounts/sua-conta/projects/medmentor/builds
```

---

## Passo 9: Criar App na Play Store

### 9.1 Acessar Console

1. Acesse: https://play.google.com/console
2. Clique em **"Criar app"**

### 9.2 Preencher Informações Básicas

- **Nome do app**: MedMentor
- **Idioma padrão**: Português (Brasil)
- **Tipo**: Aplicativo
- **Grátis/Pago**: Grátis

### 9.3 Store Listing (Página da Loja)

**Informações Obrigatórias**:

- **Título**: MedMentor - Mentoria Médica com IA
- **Descrição curta** (80 caracteres):
  ```
  Conecte-se com especialistas médicos através de assistentes de IA
  ```

- **Descrição completa** (4000 caracteres):
  ```
  MedMentor é a plataforma revolucionária que conecta médicos com o conhecimento 
  de especialistas renomados através de assistentes de IA personalizados.
  
  🤖 CONVERSE COM ESPECIALISTAS
  Faça perguntas e discuta casos clínicos com bots de IA treinados no 
  conhecimento de médicos mentores especializados.
  
  📚 CONTEÚDO ESPECIALIZADO
  Cada mentor compartilha seu acervo de conhecimento - livros, artigos, 
  guias clínicos - que alimenta as respostas da IA.
  
  🎯 RESPOSTAS COM FONTES
  Todas as respostas incluem citações das fontes, permitindo que você 
  aprofunde seu estudo.
  
  FUNCIONALIDADES:
  • Chat inteligente com bots de mentores
  • Histórico completo de conversas
  • Busca por especialidade
  • Sistema de feedback
  • Perfil personalizável
  
  ESPECIALIDADES DISPONÍVEIS:
  • Cardiologia
  • Neurologia
  • Pediatria
  • E muito mais!
  
  Transforme sua prática médica com MedMentor!
  ```

- **Ícone**: Upload icon.png (512x512px)
- **Gráfico de recursos**: Upload banner (1024x500px)
- **Screenshots**: Mínimo 2, recomendado 8
- **Categoria**: Saúde e fitness > Médico
- **Email de contato**: suporte@medmentor.com

---

## Passo 10: Upload do AAB

### 10.1 Ir para "Versões"

1. Menu lateral: **Produção**
2. Clique em **Criar nova versão**

### 10.2 Upload

1. Clique em **"Fazer upload"**
2. Selecione o arquivo `.aab` baixado
3. Aguarde processamento

### 10.3 Notas da Versão

```
Versão 1.0.0 - Lançamento Inicial

• Chat com mentores especializados
• Histórico de conversas
• Sistema de feedback
• Perfil personalizável
• Busca por especialidade
```

---

## Passo 11: Preencher Questionário

### Conteúdo

- **Classificação etária**: L (Livre)
- **Privacidade**: Link para política de privacidade
- **Anunçios**: Não (se aplicar)

### Política de Privacidade

**Obrigatório!** Hospede em:
- Site próprio
- GitHub Pages
- Google Sites

Exemplo: `https://medmentor.com/privacy-policy`

---

## Passo 12: Teste Interno

### Criar Release de Teste

1. Antes de publicar, crie teste interno
2. Adicione testadores (emails)
3. Testadores recebem link para baixar
4. Colete feedback

### Lista de Testadores

```
teste1@example.com
teste2@example.com
```

---

## Passo 13: Enviar para Revisão

1. Complete todos os itens pendentes
2. Clique em **"Enviar para revisão"**
3. Aguarde 1-3 dias úteis
4. Google notificará por email

**Dicas**:
- Responda rapidamente a solicitações
- Tenha política de privacidade clara
- Screenshots de qualidade
- Descrição detalhada

---

## Passo 14: Atualizações Futuras

### Incrementar Versão

```json
// app.json
{
  "version": "1.0.1",  // Incrementar
  "android": {
    "versionCode": 2  // Incrementar sempre
  }
}
```

### Fazer Novo Build

```bash
eas build --platform android --profile production
```

### Upload Nova Versão

1. Play Console → Produção
2. Criar nova versão
3. Upload novo AAB
4. Adicionar notas da versão
5. Enviar

---

## Build iOS (Future)

### Pré-requisitos
- Apple Developer Account ($99/ano)
- Certificados iOS

### Comandos

```bash
# Build iOS
eas build --platform ios --profile production

# Submit para App Store
eas submit --platform ios
```

---

## Over-the-Air (OTA) Updates

### O que são OTA Updates?

Atualizações instantâneas sem passar pela store (apenas JavaScript).

### Publicar Update

```bash
cd frontend

# Publicar atualização
eas update --branch production --message "Correção de bugs"
```

### Quando Usar OTA

✅ **Usar OTA para**:
- Correção de bugs JavaScript
- Atualizações de UI
- Mudanças de texto
- Ajustes de estilo

❌ **NÃO usar OTA para**:
- Atualizações de pacotes nativos
- Mudanças em app.json
- Novas permissões
- Plugins nativos

---

## Testing

### Teste Local

```bash
cd frontend

# Android emulator
yarn android

# Dispositivo físico
yarn start
# Escaneie QR code com Expo Go
```

### Teste APK

```bash
# Build APK para teste
eas build --platform android --profile preview

# Instalar via ADB
adb install app.apk
```

---

## Troubleshooting

### Build falha

**Erro: credentials**
```bash
# Configurar credenciais
eas credentials
```

**Erro: package name**
- Verificar `android.package` em app.json
- Deve ser único e válido (ex: com.seudominio.app)

**Erro: memory**
- Aumentar tier do EAS (pago)
- Ou construir localmente com `eas build --local`

### App rejeitado

**Motivos comuns**:
- Política de privacidade ausente
- Screenshots insuficientes
- Descrição vaga
- Conteúdo impróprio
- Bugs críticos

**Solução**:
- Ler feedback do Google
- Corrigir problemas
- Reenviar

---

## Checklist de Publicação

### Antes do Build
- [ ] app.json configurado corretamente
- [ ] Versão e versionCode incrementados
- [ ] Ícones e splash screen criados
- [ ] Backend em produção funcionando
- [ ] EXPO_PUBLIC_BACKEND_URL apontando para produção
- [ ] Testado em dispositivos reais

### Assets da Store
- [ ] 2+ screenshots (1080x1920px)
- [ ] Ícone 512x512px
- [ ] Banner 1024x500px
- [ ] Vídeo promocional (opcional)

### Textos
- [ ] Título (máx 50 caracteres)
- [ ] Descrição curta (máx 80 caracteres)
- [ ] Descrição completa (até 4000 caracteres)
- [ ] Notas da versão

### Legal
- [ ] Política de privacidade publicada
- [ ] Termos de uso (opcional)
- [ ] Email de contato válido

### Play Console
- [ ] Categoria selecionada
- [ ] Classificação etária preenchida
- [ ] Questionário de conteúdo respondido
- [ ] Informações do desenvolvedor completas

---

## Comandos Úteis

```bash
# Ver builds
eas build:list

# Cancelar build
eas build:cancel

# Ver detalhes
eas build:view [build-id]

# Configurar credenciais
eas credentials

# Ver projects
eas projects

# Ver updates OTA
eas update:list
```

---

## Custos

### EAS Build (Expo)
- **Free Tier**: 30 builds/mês
- **Production**: $29/mês (unlimited builds)

### Play Store
- **Registro**: $25 (única vez)
- **Manutenção**: Gratuito

---

## Timeline

```
Dia 1: Preparar assets e configurações (2-4 horas)
Dia 1: Build e upload AAB (1 hora)
Dia 2-4: Revisão do Google (1-3 dias)
Dia 5: App publicado! 🎉
```

---

## Pós-Publicação

### Monitoramento
- Google Play Console Analytics
- Crash reports (Sentry)
- User reviews
- Download stats

### Marketing
- Compartilhar link da loja
- Promoção em redes sociais
- Email para beta testers
- Press release (opcional)

---

## Links Úteis

- 📚 [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- 📚 [Play Console Help](https://support.google.com/googleplay/android-developer/)
- 📚 [App Store Guidelines](https://developer.android.com/distribute/best-practices/launch/launch-checklist)

---

**Seu app estará disponível na Play Store! 🚀🎉**
