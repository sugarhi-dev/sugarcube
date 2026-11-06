import { randomUUID } from 'node:crypto';
import { Config, Service } from '@sugarcube/server-core';
import { Resend, type CreateEmailOptions } from 'resend';

export type EmailMessage = {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
    idempotencyKey?: string;
};

export type SentEmail = {
    id: string;
};

export class EmailService extends Service {
    private readonly client: Resend;
    private readonly from: string;

    constructor(config: Config) {
        super('EmailService');
        this.client = new Resend(config.require('RESEND_API_KEY'));
        this.from = config.require('EMAIL_FROM');
    }

    async send(message: EmailMessage): Promise<SentEmail> {
        const recipients = addresses(message.to);
        if (recipients.length === 0) {
            throw new Error('Email must include a recipient.');
        }

        const subject = message.subject.trim();
        if (subject.length === 0) {
            throw new Error('Email must include a subject.');
        }

        const html = present(message.html);
        const text = present(message.text);
        if (!html && !text) {
            throw new Error('Email must include html or text.');
        }

        const idempotencyKey = present(message.idempotencyKey) ?? randomUUID();
        let failure: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await this.deliver({
                    from: present(message.from) ?? this.from,
                    to: recipients,
                    subject,
                    html,
                    text,
                    cc: message.cc,
                    bcc: message.bcc,
                    replyTo: message.replyTo,
                }, idempotencyKey);
            } catch (error) {
                failure = error instanceof Error ? error : new Error('Email send failed.');
                if (!isUnresolved(failure) || attempt === 2) {
                    throw failure;
                }
            }
        }

        throw failure ?? new Error('Email send failed.');
    }

    private async deliver(message: Outbound, idempotencyKey: string): Promise<SentEmail> {
        const { data, error } = await this.client.emails.send(
            payload(message),
            { idempotencyKey },
        );

        if (error || !data) {
            const detail = error?.message ?? 'Resend returned an empty response.';
            throw new Error(`Email send failed: ${detail}`);
        }

        return { id: data.id };
    }
}

type Outbound = {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
};

function payload(message: Outbound): CreateEmailOptions {
    const shared = {
        from: message.from,
        to: message.to,
        subject: message.subject,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
    };

    if (message.html && message.text) {
        return { ...shared, html: message.html, text: message.text };
    }
    if (message.html) {
        return { ...shared, html: message.html };
    }
    if (message.text) {
        return { ...shared, text: message.text };
    }
    throw new Error('Email must include html or text.');
}

function addresses(value: string | string[]): string[] {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => item.trim()).filter((item) => item.length > 0);
}

function isUnresolved(error: Error): boolean {
    return error.message.includes('Unable to fetch data');
}

function present(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed;
}
