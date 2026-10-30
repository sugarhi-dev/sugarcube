import { Config, Controller, type Context } from "@sugarcube/server-core";
import type { Express, Request, Response } from 'express';
import { ulid } from 'ulidx';
import { z } from 'zod';
import { UserSchema } from '../entities/user.js';
import { parseBody } from './httpHelpers.js';
import { UserLogic } from "../logic/userLogic.js";

const OidcCallbackRequestSchema = z.object({
    code: z.string().min(1).meta({ description: 'Authorization code from the Keycloak redirect.' }),
    client_id: z.string().min(1).meta({ description: 'Keycloak client id that issued the authorization code.' }),
    redirect_uri: z.string().min(1).meta({ description: 'The redirect_uri sent in the authorization request.' }),
    session_state: z.string().min(1).meta({ description: 'Keycloak session state from the redirect.' }),
});

export const authRequestSchemas = { OidcCallbackRequest: OidcCallbackRequestSchema };


export class AuthController extends Controller {    
    private readonly userLogic: UserLogic;
    private readonly clientSecret: string;
    private readonly keycloakIssuer: string;

    constructor(config: Config, app: Express, userLogic: UserLogic)
    {
        super(app);        
        this.userLogic = userLogic;
        this.clientSecret = config.require('OAUTH_CLIENT_SECRET');
        this.keycloakIssuer = config.require('KEYCLOAK_ISSUER');
        this.post('/api/auth/oidc/callback', this.POST_oidc_callback.bind(this));
    }

    protected async POST_oidc_callback(ctx: Context, req: Request, res: Response): Promise<void>
    {        
        const { code, session_state, redirect_uri, client_id } = parseBody(OidcCallbackRequestSchema, req.body);
        await this.authorizeClient(ctx, res, code, session_state, redirect_uri, client_id, this.clientSecret);
    }

    private async authorizeClient(
        ctx: Context,
        res: Response,
        code: string,
        session_state: string,
        redirect_uri: string,
        client_id: string,
        client_secret: string,
    ): Promise<void> {                
        const keycloak_base_url = this.keycloakIssuer;
        
        const url = `${keycloak_base_url}/protocol/openid-connect/token`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: [
                `grant_type=authorization_code`,
                `code=${encodeURIComponent(code)}`,
                `client_id=${encodeURIComponent(client_id)}`,
                `client_secret=${encodeURIComponent(client_secret)}`,
                `redirect_uri=${encodeURIComponent(redirect_uri)}`,
                `session_state=${encodeURIComponent(session_state)}`
            ].join('&'),
        });
        const data: any = await response.json();

        if (!response.ok) {
            this.log.error(`${ctx.traceId} Failed to fetch token from OIDC provider. Status: ${response.status}. Body: ${JSON.stringify(data)}`);
            ctx.error('Sign-in was rejected by the identity provider.', 502);
            this.checkAndRespond(ctx, res);
            return;
        }

        const payload = data.id_token?.split('.')[1];
        if (!payload) {
            this.log.error(`${ctx.traceId} Token is missing a payload segment.`);
            ctx.error('Sign-in response did not include an identity token.', 502);
            this.checkAndRespond(ctx, res);
            return;
        }

        const claims: Record<string, unknown> = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

        const user = UserSchema.parse({
            id: ulid(),
            first_name: claims.given_name,
            last_name: claims.family_name,
            email: claims.email,
            keycloak_id: claims.sub,
        });

        await this.userLogic.createUser(ctx, user);

        this.checkAndRespond(ctx, res, data);
    }
}
