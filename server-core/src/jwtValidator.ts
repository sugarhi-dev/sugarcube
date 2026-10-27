import { exit } from 'node:process';
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet, type JWTPayload } from 'jose';
import { Base } from './base.js';

export class JwtValidator extends Base {
    private issuer = '';
    private getKey: ReturnType<typeof createLocalJWKSet> | undefined;

    constructor()
    {
        super();
    }

    public async loadSigningKeys(): Promise<void>
    {
        const issuer = process.env.KEYCLOAK_ISSUER;
        const jwksUrl = process.env.KEYCLOAK_JWKS_URL;
        if (!issuer || !jwksUrl) {
            this.log.fatal('KEYCLOAK_ISSUER and KEYCLOAK_JWKS_URL must be set');
            exit(1);
        }

        const response = await fetch(jwksUrl);
        if (!response.ok) {
            this.log.fatal(`Failed to fetch JWKS: ${response.status}`);
            exit(1);
        }

        const jwks = await response.json() as JSONWebKeySet;
        const signingKeys = jwks.keys.filter((jwk) =>
            jwk.kty === 'RSA' && typeof jwk.kid === 'string' && jwk.kid.length > 0 && (!jwk.use || jwk.use === 'sig'),
        );
        if (signingKeys.length === 0) {
            this.log.fatal('JWKS contained no RSA signing keys');
            exit(1);
        }

        this.issuer = issuer;
        this.getKey = createLocalJWKSet({ keys: signingKeys });
        this.log.info(`Cached ${signingKeys.length} signing keys for ${this.issuer}`);
    }

    public async validate(token: string): Promise<JWTPayload | undefined>
    {
        if (!this.getKey) {
            this.log.error('Signing keys are not loaded');
            return;
        }

        try {
            const { payload } = await jwtVerify(token, this.getKey, {
                issuer: this.issuer,
                algorithms: ['RS256'],
                requiredClaims: ['exp'],
            });
            return payload;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log.error(`Invalid token: ${message}`);
            return;
        }
    }
}
