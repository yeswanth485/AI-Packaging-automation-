# Deployment Guide

## Overview

This guide covers deploying the AI Packaging Optimizer to production environments.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- SSL certificates obtained
- PostgreSQL database (managed or self-hosted)
- Redis instance (managed or self-hosted)
- Minimum server requirements:
  - 4 CPU cores
  - 8GB RAM
  - 50GB storage
  - Ubuntu 20.04+ or similar Linux distribution

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=packaging_optimizer

# Redis
REDIS_PASSWORD=<strong-password>

# JWT Secrets
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>

# Encryption
ENCRYPTION_KEY=<generate-32-byte-key>

# API URL
NEXT_PUBLIC_API_URL=https://api.packaging-optimizer.com

# Grafana
GRAFANA_PASSWORD=<strong-password>

# Node Environment
NODE_ENV=production
```

### Generating Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64

# Generate encryption key
openssl rand -hex 32
```

## Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ai-packaging-optimizer.git
cd ai-packaging-optimizer
```

### 2. Configure Environment

```bash
cp .env.example .env.production
# Edit .env.production with your values
nano .env.production
```

### 3. SSL Certificates

Place your SSL certificates in `nginx/ssl/`:

```bash
mkdir -p nginx/ssl
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/
```

Or use Let's Encrypt:

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificates
sudo certbot certonly --standalone -d packaging-optimizer.com -d www.packaging-optimizer.com

# Copy to nginx directory
sudo cp /etc/letsencrypt/live/packaging-optimizer.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/packaging-optimizer.com/privkey.pem nginx/ssl/key.pem
```

### 4. Build and Start Services

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 5. Run Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate

# Verify database
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:studio
```

### 6. Verify Deployment

```bash
# Check backend health
curl https://api.packaging-optimizer.com/health

# Check frontend
curl https://packaging-optimizer.com

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Monitoring

### Prometheus

Access Prometheus at: `http://your-server:9090`

### Grafana

Access Grafana at: `http://your-server:3002`

Default credentials:
- Username: admin
- Password: (from GRAFANA_PASSWORD env var)

### Application Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# View log files
tail -f logs/combined.log
tail -f logs/error.log
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres packaging_optimizer > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backups
cat > /etc/cron.daily/postgres-backup << 'EOF'
#!/bin/bash
cd /path/to/ai-packaging-optimizer
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres packaging_optimizer | gzip > backups/backup_$(date +%Y%m%d).sql.gz
find backups/ -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /etc/cron.daily/postgres-backup
```

### Database Restore

```bash
# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres packaging_optimizer < backup_20260221.sql
```

### Redis Backup

```bash
# Redis automatically saves to disk
# Copy RDB file
docker cp packaging-optimizer-redis-prod:/data/dump.rdb ./backups/redis_backup_$(date +%Y%m%d).rdb
```

## Scaling

### Horizontal Scaling

Update `docker-compose.prod.yml` to add more backend instances:

```yaml
backend:
  deploy:
    replicas: 3
```

### Load Balancing

Nginx is already configured for load balancing. Add more upstream servers:

```nginx
upstream backend {
    server backend-1:3000;
    server backend-2:3000;
    server backend-3:3000;
}
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Fail2Ban

```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure for nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# Edit jail.local to enable nginx-http-auth
```

### 3. Regular Updates

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Security Scanning

```bash
# Scan for vulnerabilities
npm audit
docker scan packaging-optimizer-backend-prod
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from backend
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:studio
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### SSL Certificate Renewal

```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/packaging-optimizer.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/packaging-optimizer.com/privkey.pem nginx/ssl/key.pem

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Rollback Procedure

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Restore database if needed
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres packaging_optimizer < backups/backup_previous.sql
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_simulations_status ON simulations(status);
CREATE INDEX idx_usage_records_date ON usage_records(created_at);

-- Analyze tables
ANALYZE orders;
ANALYZE simulations;
ANALYZE usage_records;
```

### 2. Redis Configuration

```bash
# Increase max memory
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory 2gb
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 3. Nginx Caching

Add to nginx.conf:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/analytics/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;
    proxy_pass http://backend;
}
```

## Maintenance Windows

Schedule regular maintenance:

```bash
# Create maintenance script
cat > maintenance.sh << 'EOF'
#!/bin/bash
echo "Starting maintenance..."
docker-compose -f docker-compose.prod.yml down
# Perform updates
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
echo "Maintenance complete"
EOF

chmod +x maintenance.sh

# Schedule with cron (Sunday 2 AM)
echo "0 2 * * 0 /path/to/maintenance.sh" | crontab -
```

## Support

For deployment issues:
1. Check logs in `logs/` directory
2. Review Docker container logs
3. Check system resources
4. Verify environment variables
5. Contact support team

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Prometheus Documentation](https://prometheus.io/docs/)
