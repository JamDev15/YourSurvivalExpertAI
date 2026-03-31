#!/usr/bin/env python3
"""Deploy yoursurvivalexpert.ai to DigitalOcean droplet"""

import paramiko
import os
import sys
import tarfile
import io
import stat

# Fix Windows cp1252 encoding for Unicode characters (checkmarks, etc.)
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Server config
HOST = "167.71.250.96"
USER = "root"
PASSWORD = "OkfSfUJ&7l%WOhol"
APP_DIR = "/var/www/yoursurvivalexpert"

def run(ssh, cmd, desc=""):
    if desc:
        print(f"  → {desc}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(f"    {out[:500]}")
    if err and exit_code != 0:
        print(f"    ERR: {err[:300]}")
    return exit_code, out, err

def upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload a directory via SFTP"""
    try:
        sftp.mkdir(remote_dir)
    except:
        pass
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + "/" + item
        if os.path.isdir(local_path):
            upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

def upload_file(sftp, local_path, remote_path):
    print(f"  → Uploading {os.path.basename(local_path)}")
    sftp.put(local_path, remote_path)

def main():
    print("=" * 60)
    print("Deploying yoursurvivalexpert.ai to DigitalOcean")
    print("=" * 60)

    # Connect
    print("\n[1/7] Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print(f"  ✓ Connected to {HOST}")

    sftp = ssh.open_sftp()

    # System setup
    print("\n[2/7] Installing system packages...")
    run(ssh, "apt-get update -qq", "Updating apt")
    run(ssh, "apt-get install -y -qq nginx python3 python3-pip python3-venv certbot python3-certbot-nginx", "Installing nginx, python3, certbot")

    # Create app directory
    print("\n[3/7] Setting up app directory...")
    run(ssh, f"mkdir -p {APP_DIR}/backend {APP_DIR}/frontend", "Creating directories")

    # Upload backend files
    print("\n[4/7] Uploading backend...")
    base = r"c:\Users\Admin\Desktop\PB"

    upload_file(sftp, f"{base}\\backend\\main.py", f"{APP_DIR}/backend/main.py")
    upload_file(sftp, f"{base}\\backend\\requirements.txt", f"{APP_DIR}/backend/requirements.txt")
    upload_file(sftp, f"{base}\\backend\\.env", f"{APP_DIR}/backend/.env")

    # Install Python dependencies
    print("\n  → Setting up Python venv and installing dependencies...")
    run(ssh, f"cd {APP_DIR}/backend && python3 -m venv venv", "Creating venv")
    run(ssh, f"cd {APP_DIR}/backend && venv/bin/pip install -q -r requirements.txt", "Installing pip packages")
    print("  ✓ Backend ready")

    # Upload frontend dist
    print("\n[5/7] Uploading frontend (dist)...")
    dist_dir = f"{base}\\frontend\\dist"

    # Count files
    total = sum(len(files) for _, _, files in os.walk(dist_dir))
    print(f"  → Uploading {total} files from dist/")

    upload_dir(sftp, dist_dir, f"{APP_DIR}/frontend")

    # Also upload public files that aren't in dist
    for fname in ["robots.txt", "sitemap.xml"]:
        local = f"{base}\\frontend\\public\\{fname}"
        if os.path.exists(local):
            upload_file(sftp, local, f"{APP_DIR}/frontend/{fname}")
    print("  ✓ Frontend uploaded")

    # Configure systemd service for FastAPI
    print("\n[6/7] Configuring services...")

    systemd_service = f"""[Unit]
Description=YourSurvivalExpert FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory={APP_DIR}/backend
ExecStart={APP_DIR}/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 5050
Restart=always
RestartSec=3
Environment="PATH={APP_DIR}/backend/venv/bin"

[Install]
WantedBy=multi-user.target
"""

    # Write systemd service
    with sftp.file("/etc/systemd/system/yoursurvivalexpert.service", "w") as f:
        f.write(systemd_service)

    run(ssh, "systemctl daemon-reload", "Reloading systemd")
    run(ssh, "systemctl enable yoursurvivalexpert", "Enabling service")
    run(ssh, "systemctl restart yoursurvivalexpert", "Starting backend service")

    import time
    time.sleep(3)

    code, out, _ = run(ssh, "systemctl is-active yoursurvivalexpert", "Checking backend status")
    if "active" in out:
        print("  ✓ Backend service is running")
    else:
        print("  ⚠ Backend service status: " + out)
        run(ssh, "journalctl -u yoursurvivalexpert -n 20 --no-pager", "Backend logs")

    # Configure nginx
    nginx_config = f"""server {{
    listen 80;
    server_name yoursurvivalexpert.ai www.yoursurvivalexpert.ai;

    # Serve React frontend
    root {APP_DIR}/frontend;
    index index.html;

    # API proxy to FastAPI backend
    location /api/ {{
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }}

    # React Router - serve index.html for all routes (including /guide/city-slug pages)
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {{
        expires 30d;
        add_header Cache-Control "public, immutable";
    }}
}}
"""

    # Remove default nginx site
    run(ssh, "rm -f /etc/nginx/sites-enabled/default", "Removing default nginx site")

    # Write nginx config
    with sftp.file("/etc/nginx/sites-available/yoursurvivalexpert", "w") as f:
        f.write(nginx_config)

    run(ssh, "ln -sf /etc/nginx/sites-available/yoursurvivalexpert /etc/nginx/sites-enabled/", "Enabling nginx site")
    code, out, err = run(ssh, "nginx -t", "Testing nginx config")

    if code == 0 or "successful" in err:
        run(ssh, "systemctl restart nginx", "Restarting nginx")
        print("  ✓ Nginx configured and running")
    else:
        print(f"  ✗ Nginx config error: {err}")
        return

    # SSL with certbot
    print("\n[7/7] Setting up SSL certificate...")
    run(ssh, "systemctl stop nginx", "Stopping nginx for certbot")
    code, out, err = run(ssh,
        "certbot certonly --standalone -d yoursurvivalexpert.ai "
        "--non-interactive --agree-tos --keep-until-expiring "
        "--email techteam@patriotbrandspr.com 2>&1",
        "Obtaining SSL certificate"
    )

    if code == 0 or "Congratulations" in out or "Certificate not yet due" in out or "already exists" in out or "Certificate not yet due for renewal" in err or "not yet due for renewal" in out:
        print("  ✓ SSL certificate obtained")

        # Update nginx config with SSL
        nginx_ssl_config = f"""server {{
    listen 80;
    server_name yoursurvivalexpert.ai;
    return 301 https://yoursurvivalexpert.ai$request_uri;
}}

server {{
    listen 80;
    server_name www.yoursurvivalexpert.ai;
    return 301 https://yoursurvivalexpert.ai$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name yoursurvivalexpert.ai;

    ssl_certificate /etc/letsencrypt/live/yoursurvivalexpert.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yoursurvivalexpert.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root {APP_DIR}/frontend;
    index index.html;

    location /api/ {{
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {{
        expires 30d;
        add_header Cache-Control "public, immutable";
    }}
}}
"""
        with sftp.file("/etc/nginx/sites-available/yoursurvivalexpert", "w") as f:
            f.write(nginx_ssl_config)

        run(ssh, "nginx -t && systemctl start nginx", "Restarting nginx with SSL")

        # Auto-renew cron
        run(ssh, '(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook \'systemctl reload nginx\'") | crontab -',
            "Setting up SSL auto-renewal")
    else:
        print(f"  ⚠ SSL cert failed (DNS may not have propagated yet): {err[:200]}")
        print("  → Site will run on HTTP for now. Re-run after DNS propagates.")
        run(ssh, "systemctl start nginx", "Starting nginx (HTTP only)")

    # Final status check
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE")
    print("=" * 60)

    code, out, _ = run(ssh, "systemctl is-active nginx", "")
    print(f"  nginx:   {'✓ running' if 'active' in out else '✗ ' + out}")

    code, out, _ = run(ssh, "systemctl is-active yoursurvivalexpert", "")
    print(f"  backend: {'✓ running' if 'active' in out else '✗ ' + out}")

    code, out, _ = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost/", "")
    print(f"  HTTP:    {'✓ responding (' + out + ')' if out.startswith('2') or out.startswith('3') else '⚠ status ' + out}")

    print(f"\n  URL: http://167.71.250.96")
    print(f"  URL: https://yoursurvivalexpert.ai (once DNS propagates)")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
