import { CheckOutlined } from '@ant-design/icons';
import { Flex, Layout, Typography } from 'antd';
import type { ReactNode } from 'react';
import { copyThat } from '../../theme.ts';

const { Content, Sider } = Layout;

const steps = [
    { title: 'Basic Info' },
    { title: 'Set up your profile' },
    { title: 'Experience & project types' },
    { title: 'Upload your media' },
    { title: 'Review & go live' },
];

type OnboardingFrameProps = {
    step: number;
    accountLabel: string;
    children: ReactNode;
};

export function OnboardingFrame({ step, accountLabel, children }: OnboardingFrameProps) {
    return (
        <Layout className="onboarding-shell">
            <Sider width={280} theme="dark" className="onboarding-sider">
                <Flex vertical style={{ height: '100%', padding: '28px 22px 24px' }}>
                    <Typography.Title level={4} style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '0.08em' }}>
                        COPY
                        <Typography.Text style={{ color: copyThat.accent, fontSize: 18, fontWeight: 800, letterSpacing: '0.08em' }}>
                            THAT
                        </Typography.Text>
                    </Typography.Title>
                    <Typography.Text style={{ display: 'block', marginTop: 22, color: '#8d8680', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>
                        {accountLabel}
                    </Typography.Text>
                    <Flex vertical gap={18} style={{ marginTop: 28 }} role="list" aria-label="Setup steps">
                        {steps.map((item, index) => (
                            <StepRow key={item.title} index={index} title={item.title} current={step} />
                        ))}
                    </Flex>
                    <Typography.Paragraph style={{ marginTop: 'auto', marginBottom: 0, color: '#6f6964', fontSize: 13, lineHeight: 1.45 }}>
                        One account, many hats — you can add more positions and cities after you go live.
                    </Typography.Paragraph>
                </Flex>
            </Sider>
            <Content style={{ background: copyThat.canvas, padding: '48px 56px 64px' }}>
                <div style={{ width: 'min(680px, 100%)' }}>{children}</div>
            </Content>
        </Layout>
    );
}

function StepRow({ index, title, current }: { index: number; title: string; current: number }) {
    const number = index + 1;
    const done = number < current;
    const active = number === current;
    const markerColor = done ? '#2f9e44' : active ? copyThat.pinkHot : 'transparent';
    const titleColor = active ? '#ffffff' : done ? '#d9d3cc' : '#8a837c';

    return (
        <Flex gap={12} align="flex-start" role="listitem" aria-current={active ? 'step' : undefined}>
            <Flex
                align="center"
                justify="center"
                style={{
                    width: 28,
                    height: 28,
                    flex: '0 0 28px',
                    borderRadius: '50%',
                    background: markerColor,
                    border: done || active ? 'none' : '1px solid #4a453f',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                }}
            >
                {done ? <CheckOutlined /> : number}
            </Flex>
            <Flex vertical gap={2}>
                <Typography.Text style={{ color: titleColor, fontWeight: active ? 700 : 600, lineHeight: '28px' }}>
                    {title}
                </Typography.Text>
                <Typography.Text style={{ color: '#6f6964', fontSize: 12 }}>
                    {number} of {steps.length}
                </Typography.Text>
            </Flex>
        </Flex>
    );
}
