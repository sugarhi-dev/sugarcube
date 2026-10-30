import { exit } from 'node:process';
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet, type JWTPayload } from 'jose';
import { Base } from './base.js';
import { Config } from './config.js';

export class JwtValidator extends Base {
    private readonly issuer: string;
    private readonly jwksUrl: string;
    private getKey: ReturnType<typeof createLocalJWKSet> | undefined;

    constructor(config: Config)
    {
        super();
        this.issuer = config.require('KEYCLOAK_ISSUER');
        this.jwksUrl = config.require('KEYCLOAK_JWKS_URL');
    }

    public async loadSigningKeys(): Promise<void>
    {
        const response = await fetch(this.jwksUrl);
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
