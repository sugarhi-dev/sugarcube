#!/usr/bin/env bash
# Point the sugarcube realm at the CopyThat login theme, and allow the client
# at https://test.sugarcube.tv/ to finish sign-in.
set -euo pipefail

container="${KEYCLOAK_CONTAINER:-sugarcube-keycloak-test}"

for _ in $(seq 1 60); do
  if docker exec "$container" bash -c 'exec /opt/keycloak/bin/kcadm.sh config credentials --server http://127.0.0.1:8080/idp --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"' \
    && docker exec "$container" /opt/keycloak/bin/kcadm.sh update realms/sugarcube -s loginTheme=copythat \
    && client_id="$(docker exec "$container" /opt/keycloak/bin/kcadm.sh get clients -r sugarcube -q clientId=sugarcube --fields id | sed -n 's/.*"id" *: *"\([^"]*\)".*/\1/p' | head -n 1)" \
    && [[ -n "$client_id" ]] \
    && docker exec "$container" /opt/keycloak/bin/kcadm.sh update "clients/${client_id}" -r sugarcube \
      -s 'rootUrl=https://test.sugarcube.tv' \
      -s 'baseUrl=https://test.sugarcube.tv/' \
      -s 'redirectUris=["https://test.sugarcube.tv/auth/callback"]' \
      -s 'webOrigins=["https://test.sugarcube.tv"]'; then
    echo "Keycloak realm sugarcube is using login theme copythat"
    echo "Keycloak client sugarcube accepts https://test.sugarcube.tv/auth/callback"
    exit 0
  fi
  sleep 5
done

echo "Could not configure the sugarcube realm for https://test.sugarcube.tv" >&2
exit 1
