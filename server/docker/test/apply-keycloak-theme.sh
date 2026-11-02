#!/usr/bin/env bash
# Point the sugarcube realm at the CopyThat login theme mounted into Keycloak.
set -euo pipefail

container="${KEYCLOAK_CONTAINER:-sugarcube-keycloak-test}"

for _ in $(seq 1 60); do
  if docker exec "$container" bash -c 'exec /opt/keycloak/bin/kcadm.sh config credentials --server http://127.0.0.1:8080/idp --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"' \
    && docker exec "$container" /opt/keycloak/bin/kcadm.sh update realms/sugarcube -s loginTheme=copythat; then
    echo "Keycloak realm sugarcube is using login theme copythat"
    exit 0
  fi
  sleep 5
done

echo "Could not set the sugarcube login theme to copythat" >&2
exit 1
