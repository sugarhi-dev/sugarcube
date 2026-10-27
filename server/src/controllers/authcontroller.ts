import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Express, NextFunction, Request, Response } from 'express';
import { Controller } from '@sugarcube/server-core';

type KeycloakAccessToken = JWTPayload & {
    realm_access?: {
        roles?: string[];
    };
};

export class AuthController extends Controller {
    private readonly issuer: string;
    private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

    constructor(app: Express) {
        super(app);

        const issuer = process.env.KEYCLOAK_ISSUER;
        const jwksUrl = process.env.KEYCLOAK_JWKS_URL;
        if (!issuer) {
            throw new Error('KEYCLOAK_ISSUER is not set');
        }
        if (!jwksUrl) {
            throw new Error('KEYCLOAK_JWKS_URL is not set');
        }

        this.issuer = issuer;
        this.jwks = createRemoteJWKSet(new URL(jwksUrl));
        this.app.use((req, res, next) => {
            void this.authorize(req, res, next);
        });
    }

    private async authorize(req: Request, res: Response, next: NextFunction): Promise<void> {
        const header = req.headers.authorization;
        if (header === undefined) {
            next();
            return;
        }

        const match = /^Bearer (.+)$/.exec(header);
        const token = match?.[1];
        if (!token) {
            res.sendStatus(401);
            return;
        }

        try {
            const { payload } = await jwtVerify<KeycloakAccessToken>(token, this.jwks, {
                issuer: this.issuer,
            });
            (req as Request & { auth?: KeycloakAccessToken }).auth = payload;
            next();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'JWT verification failed';
            this.log.warn(message);
            res.sendStatus(401);
        }
    }
}
