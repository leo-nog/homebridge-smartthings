# Como Instalar o Plugin no Homebridge

## Pré-requisitos

### 1. Instalar Node.js

O plugin requer Node.js versão >= 18.0.0. Se você não tem Node.js instalado:

1. **Baixe o Node.js:**
   - Acesse: https://nodejs.org/
   - Baixe a versão LTS (Long Term Support) - recomendado
   - Ou baixe a versão Current se preferir

2. **Instale o Node.js:**
   - Execute o instalador baixado
   - Siga as instruções do instalador
   - **IMPORTANTE:** Certifique-se de marcar a opção "Add to PATH" durante a instalação

3. **Verifique a instalação:**
   Abra um novo terminal/PowerShell e execute:
   ```bash
   node --version
   npm --version
   ```
   
   Você deve ver as versões do Node.js e npm. Se não funcionar, reinicie o terminal ou o computador.

### 2. Instalar Homebridge (se ainda não tiver)

Se você ainda não tem o Homebridge instalado:

**Opção A - Via npm (recomendado):**
```bash
npm install -g homebridge homebridge-config-ui-x
```

**Opção B - Via Homebridge Image (para Raspberry Pi):**
Siga as instruções em: https://github.com/homebridge/homebridge-image

---

## Opção 1: Instalar Versão Local (Para Testar Mudanças)

### Passo 1: Compilar o Projeto

Primeiro, você precisa compilar o código TypeScript para JavaScript:

```bash
npm run build
```

Isso criará a pasta `dist/` com o código JavaScript compilado.

### Passo 2: Instalar no Homebridge

#### Se o Homebridge estiver na mesma máquina:

```bash
npm link
```

Depois, no diretório do Homebridge:

```bash
npm link homebridge-smartthings-ik
```

#### Se o Homebridge estiver em outra máquina ou usar Homebridge Config UI X:

1. Compile o projeto: `npm run build`
2. Copie a pasta `dist/` e o `package.json` para o servidor do Homebridge
3. No servidor do Homebridge, instale o plugin localmente:

```bash
cd /caminho/para/homebridge-smartthings
npm install
npm link
```

4. No diretório do Homebridge:

```bash
npm link homebridge-smartthings-ik
```

### Passo 3: Configurar no Homebridge

Adicione a configuração no `config.json` do Homebridge:

```json
{
    "platforms": [
        {
            "platform": "HomeBridgeSmartThings",
            "name": "SmartThings Plugin",
            "AccessToken": "SEU_TOKEN_AQUI",
            "BaseURL": "https://api.smartthings.com/v1",
            "PollSensorsSeconds": 10,
            "PollSwitchesAndLightsSeconds": 15
        }
    ]
}
```

### Passo 4: Reiniciar Homebridge

Reinicie o Homebridge para carregar o plugin.

---

## Opção 2: Instalar via npm (Versão Publicada)

Se você quiser instalar a versão oficial do npm (sem as suas modificações):

```bash
npm install -g homebridge-smartthings-ik
```

Ou via Homebridge Config UI X:
1. Abra a interface web do Homebridge
2. Vá em "Plugins"
3. Procure por "homebridge-smartthings-ik"
4. Clique em "Install"

---

## Obter Token do SmartThings

1. Acesse: https://account.smartthings.com/tokens
2. Crie um novo token
3. Certifique-se de ter todas as permissões de dispositivos
4. Se usar "IgnoreLocations", adicione a permissão "r:locations"
5. Copie o token e adicione na configuração

---

## Desenvolvimento com Watch Mode

Para desenvolvimento ativo com recompilação automática:

```bash
npm run watch
```

Isso irá:
- Compilar o projeto
- Criar um link simbólico
- Monitorar mudanças e recompilar automaticamente

---

## Verificar Instalação

Após instalar, verifique os logs do Homebridge para confirmar que o plugin foi carregado:

```
[HomeBridgeSmartThings] Finished initializing platform: SmartThings Plugin
```

---

## Notas Importantes

- O plugin precisa ser compilado antes de ser usado
- Se você fizer mudanças no código, precisa recompilar (`npm run build`)
- O diretório `dist/` contém o código JavaScript que o Homebridge executa
- Certifique-se de que o Node.js está na versão >= 18.0.0
- **Se o npm não for reconhecido:** Reinicie o terminal/PowerShell após instalar o Node.js, ou adicione manualmente o Node.js ao PATH do sistema

## Solução de Problemas

### "npm não é reconhecido"

**Solução 1:** Reinicie o terminal/PowerShell após instalar o Node.js

**Solução 2:** Adicione manualmente ao PATH:
1. Encontre onde o Node.js foi instalado (geralmente `C:\Program Files\nodejs\`)
2. Adicione ao PATH do sistema:
   - Windows: Configurações → Sistema → Variáveis de Ambiente → Path → Adicionar
   - Adicione: `C:\Program Files\nodejs\`

**Solução 3:** Reinstale o Node.js e certifique-se de marcar "Add to PATH"

### Verificar se Node.js está instalado

Execute no PowerShell:
```powershell
Get-Command node -ErrorAction SilentlyContinue
Get-Command npm -ErrorAction SilentlyContinue
```

Se não retornar nada, o Node.js não está no PATH.


