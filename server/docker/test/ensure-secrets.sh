#!/usr/bin/env bash
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="${SUGARCUBE_TEST_ENV:-$dir/.env}"

rand() {
  openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-48
}

if [[ -f "$env_file" ]]; then
  echo "Using existing test secrets at $env_file"
  exit 0
fi

mkdir -p "$(dirname "$env_file")"

postgres_password="$(rand)"
keycloak_admin_password="$(rand)"
aws_access_key_id="sc$(rand | cut -c1-20)"
aws_secret_access_key="$(rand)"
oauth_client_secret="$(rand)"

umask 077
cat >"$env_file" <<EOF
POSTGRES_USER=sugarcube
POSTGRES_PASSWORD=${postgres_password}
POSTGRES_DB=sugarcube
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=${keycloak_admin_password}
AWS_ACCESS_KEY_ID=${aws_access_key_id}
AWS_SECRET_ACCESS_KEY=${aws_secret_access_key}
S3_BUCKET=sugarcube
S3_ENDPOINT=http://seaweedfs:8333
OAUTH_CLIENT_ID=sugarcube
OAUTH_CLIENT_SECRET=${oauth_client_secret}
KEYCLOAK_ISSUER=https://sugarcube.tv/idp/realms/sugarcube
KEYCLOAK_JWKS_URL=http://keycloak:8080/idp/realms/sugarcube/protocol/openid-connect/certs
PORT=3000
DATABASE_URL=postgresql://sugarcube:${postgres_password}@postgres:5432/sugarcube
EOF

echo "Generated test secrets at $env_file"
echo "Keycloak admin user: admin (password stored in secrets file)"
