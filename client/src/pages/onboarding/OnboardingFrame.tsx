import { CheckOutlined } from '@ant-design/icons';
import { ConfigProvider, Layout } from 'antd';
import type { ReactNode } from 'react';
import { onboardingTheme } from '../../theme.ts';

const { Content, Sider } = Layout;

const steps = [
    { title: 'Basic info' },
    { title: 'Set up your profile' },
    { title: 'Experience & project types' },
    { title: 'Upload your media' },
    { title: 'Review & go live' },
    { title: 'Wait for approval' },
];

type OnboardingFrameProps = {
    step: number;
    accountLabel: string;
    children: ReactNode;
    note?: string;
    contentWidth?: number;
};

export function OnboardingFrame({
    step,
    accountLabel,
    children,
    note = 'One account, many hats — you can add more positions and cities after you go live.',
    contentWidth = 560,
}: OnboardingFrameProps) {
    return (
        <ConfigProvider theme={onboardingTheme}>
            <Layout className="onboarding-shell">
                <Sider width={232} theme="light" className="onboarding-sider">
                    <div className="onboarding-sider-inner">
                        <p className="onboarding-brand">
                            COPY
                            <span className="onboarding-brand-accent">THAT</span>
                        </p>
                        <p className="onboarding-account">{accountLabel}</p>
                        <div className="onboarding-steps" role="list" aria-label="Setup steps">
                            {steps.map((item, index) => (
                                <StepRow key={item.title} index={index} title={item.title} current={step} />
                            ))}
                        </div>
                        <p className="onboarding-note">{note}</p>
                    </div>
                </Sider>
                <Content className="onboarding-main" style={{ '--onboarding-progress': step - 1 }}>
                    <div className="onboarding-main-inner" style={{ width: `min(${contentWidth}px, 100%)` }}>
                        {children}
                    </div>
                </Content>
            </Layout>
        </ConfigProvider>
    );
}

function StepRow({ index, title, current }: { index: number; title: string; current: number }) {
    const number = index + 1;
    const done = number < current;
    const active = number === current;
    const state = done ? 'is-done' : active ? 'is-current' : 'is-upcoming';

    return (
        <div className={`onboarding-step ${state}`} role="listitem" aria-current={active ? 'step' : undefined}>
            <span className="onboarding-step-marker">
                {done ? <CheckOutlined /> : number}
            </span>
            <span className="onboarding-step-copy">
                <span className="onboarding-step-title">{title}</span>
                <span className="onboarding-step-meta">
                    {number} of {steps.length}
                </span>
            </span>
        </div>
    );
}
