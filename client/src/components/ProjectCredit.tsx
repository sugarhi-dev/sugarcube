import { HolderOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

export type CreditFact = {
    label: string;
    value: string | null;
    wide?: boolean;
};

export function ProjectCredit({
    name,
    facts,
    actions,
    handle = true,
    boxed = true,
}: {
    name: string;
    facts: CreditFact[];
    actions?: ReactNode;
    handle?: boolean;
    boxed?: boolean;
}) {
    return (
        <li className={boxed ? 'credit-card' : 'credit-plain'}>
            {handle ? (
                <span className="credit-mark" aria-hidden>
                    <HolderOutlined />
                </span>
            ) : null}
            <div className="credit-body">
                <div className="credit-head">
                    <div className="credit-name">{name}</div>
                    {actions ? <div className="credit-side">{actions}</div> : null}
                </div>
                <dl className="credit-facts">
                    {facts.map((fact) => (
                        <div key={fact.label} className={fact.wide ? 'credit-fact is-wide' : 'credit-fact'}>
                            <dt>{fact.label}</dt>
                            <dd>{fact.value && fact.value.trim().length > 0 ? fact.value : '—'}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </li>
    );
}

export function projectFacts(input: {
    date: string;
    position: string | null | undefined;
    company: string | null;
    leadProducer: string;
    leadProducerEmail: string | null;
}): CreditFact[] {
    return [
        { label: 'Date', value: formatCreditDate(input.date) },
        { label: 'Position', value: input.position ?? null },
        { label: 'Production company', value: input.company },
        { label: 'Lead producer', value: input.leadProducer },
        { label: 'Lead producer email', value: input.leadProducerEmail },
    ];
}

function formatCreditDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return value;
    }
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return value;
    }
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
