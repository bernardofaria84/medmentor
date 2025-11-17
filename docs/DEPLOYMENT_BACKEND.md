# 🚀 Deploy Backend - AWS Guide

## Visão Geral

Guia completo para fazer deploy do backend MedMentor na AWS.

---

## Opções de Deploy

### Opção 1: EC2 (Recomendado para MVP)
- Controle total do servidor
- Configuração flexível
- Custo previsível
- Bom para começar

### Opção 2: AWS Lambda + API Gateway
- Serverless
- Auto-scaling
- Pay per use
- Mais complexo

### Opção 3: ECS/EKS (Containers)
- Orquestração com Docker
- Escalabilidade avançada
- Requer mais conhecimento

**Este guia foca na Opção 1 (EC2)**

---

## Pré-requisitos

- Conta AWS ativa
- AWS CLI instalado
- Chave SSH configurada
- Domínio (opcional)

---

## Passo 1: Configurar MongoDB

### Opção A: MongoDB Atlas (Recomendado)

1. Acesse https://www.mongodb.com/cloud/atlas
2. Crie conta gratuita
3. Crie novo cluster (M0 Free)
4. Configure Network Access:
   - Add IP: `0.0.0.0/0` (ou IP do EC2)
5. Crie Database User
6. Obtenha Connection String:
   ```
   mongodb+srv://user:password@cluster.mongodb.net/medmentor_db
   ```

### Opção B: MongoDB na EC2

```bash
# Instalar MongoDB
sudo apt-get install -y mongodb-org

# Iniciar serviço
sudo systemctl start mongod
sudo systemctl enable mongod

# Configurar autenticação
mongo
> use admin
> db.createUser({user: "admin", pwd: "senha-segura", roles: ["root"]})
```

---

## Passo 2: Criar EC2 Instance

### Via AWS Console

1. **Launch Instance**
   - AMI: Ubuntu Server 22.04 LTS
   - Instance Type: t3.small (mínimo)
   - Storage: 20GB gp3

2. **Security Group**
   ```
   Inbound Rules:
   - SSH (22): Seu IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - Custom (8001): 0.0.0.0/0 (temporário)
   ```

3. **Key Pair**
   - Criar novo ou usar existente
   - Baixar .pem file

4. **Launch**

### Via AWS CLI

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name sua-chave \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=medmentor-backend}]'
```

---

## Passo 3: Conectar ao Servidor

```bash
# Ajustar permissões da chave
chmod 400 sua-chave.pem

# Conectar via SSH
ssh -i sua-chave.pem ubuntu@<IP-PUBLICO>
```

---

## Passo 4: Instalar Dependências

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Instalar Git
sudo apt install -y git

# Instalar Nginx
sudo apt install -y nginx

# Instalar Supervisor
sudo apt install -y supervisor
```

---

## Passo 5: Clonar Repositório

```bash
# Criar diretório
sudo mkdir -p /var/www/medmentor
sudo chown ubuntu:ubuntu /var/www/medmentor

# Clonar
cd /var/www/medmentor
git clone https://github.com/seu-usuario/medmentor.git .
```

---

## Passo 6: Configurar Backend

```bash
# Ir para pasta backend
cd /var/www/medmentor/backend

# Criar virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo .env
cat > .env << EOF
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/
DB_NAME=medmentor_db
EMERGENT_LLM_KEY=sk-emergent-seu-key
JWT_SECRET=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
EOF

# Seed database (opcional)
python seed_data.py
```

---

## Passo 7: Configurar Supervisor

```bash
# Criar arquivo de configuração
sudo nano /etc/supervisor/conf.d/medmentor.conf
```

**Conteúdo**:
```ini
[program:medmentor-backend]
command=/var/www/medmentor/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
directory=/var/www/medmentor/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/medmentor/backend.err.log
stdout_logfile=/var/log/medmentor/backend.out.log
user=ubuntu
environment=PATH="/var/www/medmentor/backend/venv/bin"
```

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/medmentor
sudo chown ubuntu:ubuntu /var/log/medmentor

# Recarregar Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start medmentor-backend

# Verificar status
sudo supervisorctl status
```

---

## Passo 8: Configurar Nginx

```bash
# Criar configuração
sudo nano /etc/nginx/sites-available/medmentor
```

**Conteúdo**:
```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/medmentor /etc/nginx/sites-enabled/

# Remover default
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## Passo 9: Configurar SSL (HTTPS)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d api.seudominio.com

# Auto-renewal (já configurado)
sudo certbot renew --dry-run
```

---

## Passo 10: Testar Deploy

```bash
# Health check
curl https://api.seudominio.com/api/health

# Deve retornar:
# {"status":"healthy","timestamp":"...","service":"MedMentor API"}
```

---

## Comandos Úteis

### Supervisor
```bash
# Ver logs
sudo tail -f /var/log/medmentor/backend.out.log
sudo tail -f /var/log/medmentor/backend.err.log

# Reiniciar serviço
sudo supervisorctl restart medmentor-backend

# Parar serviço
sudo supervisorctl stop medmentor-backend

# Status
sudo supervisorctl status
```

### Nginx
```bash
# Testar config
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Atualizar Código
```bash
cd /var/www/medmentor
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart medmentor-backend
```

---

## Monitoramento

### CloudWatch Agent

```bash
# Instalar
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configurar
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### Uptime Monitoring
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://pingdom.com

---

## Backup

### Snapshot EC2
```bash
aws ec2 create-snapshot \
  --volume-id vol-xxxxx \
  --description "MedMentor backup $(date +%Y%m%d)"
```

### Backup MongoDB
```bash
# Via mongodump
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Agendar com cron
crontab -e
# 0 2 * * * mongodump --uri="..." --out=/backup/$(date +%Y%m%d)
```

---

## Segurança

### Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Fail2ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### Atualizações Automáticas
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Troubleshooting

### Serviço não inicia
```bash
# Verificar logs
sudo supervisorctl tail medmentor-backend stderr

# Testar manualmente
cd /var/www/medmentor/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Erro 502 Bad Gateway
```bash
# Verificar se backend está rodando
sudo supervisorctl status

# Testar porta 8001
curl http://localhost:8001/api/health

# Verificar logs Nginx
sudo tail -f /var/log/nginx/error.log
```

### Alto uso de memória
```bash
# Ver processos
htop

# Reduzir workers
# Editar: /etc/supervisor/conf.d/medmentor.conf
# --workers 4 → --workers 2
```

---

## Custos Estimados (AWS)

- **EC2 t3.small**: ~$15/mês
- **MongoDB Atlas M0**: Grátis
- **EBS 20GB**: ~$2/mês
- **Transfer**: ~$5/mês
- **Total**: ~$22/mês

---

## Checklist Final

- [ ] EC2 configurada e rodando
- [ ] MongoDB conectado
- [ ] Backend respondendo em /api/health
- [ ] Nginx como reverse proxy
- [ ] SSL/HTTPS configurado
- [ ] Supervisor gerenciando processo
- [ ] Logs funcionando
- [ ] Firewall configurado
- [ ] Backup automático agendado
- [ ] Monitoramento ativo

---

**Deploy completo! Backend MedMentor rodando na AWS! 🎉**
