import { ArrowRightOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Flex, Form, Layout, Typography } from 'antd';
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { chooseAccountType, type AccountType } from '../../api/me.ts';
import { useAppDispatch, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { sessionCleared } from '../../store/sessionSlice.ts';
import { copyThat } from '../../theme.ts';
import { onboardingProfilePath } from './OnboardingProfile.tsx';

const { Content } = Layout;

export const onboardingAccountTypePath = '/onboarding/account-type';

const roles: Array<{
    value: AccountType;
    title: string;
    eyebrow: string;
    description: string;
    icon: ReactNode;
}> = [
    {
        value: 'client',
        title: "I'm a Client",
        eyebrow: 'HIRE CREW & REQUEST WORK',
        description: 'Post projects, book crew, request coverage, manage payments — all with transparent rates.',
        icon: <UserOutlined />,
    },
    {
        value: 'crew',
        title: "I'm Crew",
        eyebrow: 'GET BOOKED FOR WORK',
        description: 'Build a profile, list a day rate, get booked, or send availability to clients.',
        icon: <VideoCameraOutlined />,
    },
];

export function OnboardingAccountType() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const { message } = AntdApp.useApp();
    const [accountType, setAccountType] = useState<AccountType>('client');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        document.title = 'How will you use CopyThat?';
    }, []);

    function signOut(): void {
        dispatch(sessionCleared());
        navigate('/sign-in', { replace: true });
    }

    function selectRole(role: AccountType): void {
        setAccountType(role);
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>, role: AccountType): void {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        event.preventDefault();
        selectRole(role);
    }

    async function onFinish(): Promise<void> {
        if (!session) {
            return;
        }

        setSaving(true);
        try {
            const user = await chooseAccountType(session.accessToken, accountType);
            dispatch(profileLoaded({ user, forSubject: session.profile.subject }));
            navigate(user.status === 'setup' ? onboardingProfilePath : '/', { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save your account type.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Layout style={{ minHeight: '100vh', background: copyThat.canvas }}>
            <Content style={{ padding: '28px 36px 48px' }}>
                <Flex align="center" justify="space-between">
                    <Typography.Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '0.08em' }}>
                        COPY
                        <Typography.Text style={{ color: copyThat.accent, fontSize: 18, fontWeight: 800, letterSpacing: '0.08em' }}>
                            THAT
                        </Typography.Text>
                    </Typography.Title>
                    <Button type="text" onClick={signOut} style={{ color: copyThat.muted }}>
                        Sign out
                    </Button>
                </Flex>

                <Flex vertical style={{ width: 'min(920px, 100%)', margin: '56px auto 0' }}>
                    <Typography.Title level={2} style={{ margin: 0, textAlign: 'center', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        How will you use CopyThat?
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0', textAlign: 'center' }}>
                        Pick one — you can add the other side later.
                    </Typography.Paragraph>

                    <Form
                        onFinish={() => void onFinish()}
                        style={{ marginTop: 28 }}
                        requiredMark={false}
                    >
                        <Flex gap={20} align="stretch" wrap role="radiogroup" aria-label="How will you use CopyThat?">
                            {roles.map((role) => {
                                const selected = accountType === role.value;
                                return (
                                    <Flex key={role.value} flex="1 1 320px">
                                        <Card
                                            hoverable
                                            variant="outlined"
                                            className="onboarding-role-card"
                                            role="radio"
                                            aria-checked={selected}
                                            tabIndex={0}
                                            onClick={() => selectRole(role.value)}
                                            onKeyDown={(event) => onKeyDown(event, role.value)}
                                            style={cardStyle(selected)}
                                            styles={{ body: { padding: 22 } }}
                                        >
                                            <Flex
                                                align="center"
                                                justify="center"
                                                style={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 12,
                                                    background: selected ? copyThat.pinkHot : copyThat.iconIdle,
                                                    color: selected ? '#fff' : copyThat.muted,
                                                    fontSize: 18,
                                                }}
                                            >
                                                {role.icon}
                                            </Flex>
                                            <Typography.Title level={4} style={{ margin: '14px 0 0' }}>
                                                {role.title}
                                            </Typography.Title>
                                            <Typography.Text
                                                style={{
                                                    display: 'block',
                                                    marginTop: 10,
                                                    color: selected ? copyThat.pink : copyThat.muted,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: '0.08em',
                                                }}
                                            >
                                                {role.eyebrow}
                                            </Typography.Text>
                                            <Typography.Paragraph type="secondary" style={{ margin: '10px 0 0', minHeight: 66 }}>
                                                {role.description}
                                            </Typography.Paragraph>
                                        </Card>
                                    </Flex>
                                );
                            })}
                        </Flex>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={saving}
                            icon={<ArrowRightOutlined />}
                            iconPlacement="end"
                            style={{
                                marginTop: 22,
                                background: `linear-gradient(90deg, ${copyThat.pinkHot} 0%, ${copyThat.pink} 100%)`,
                                border: 'none',
                            }}
                        >
                            Continue as {accountType === 'client' ? 'Client' : 'Crew'}
                        </Button>
                    </Form>
                    <Typography.Paragraph type="secondary" style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 13 }}>
                        You can add another role later from your profile.
                    </Typography.Paragraph>
                </Flex>
            </Content>
        </Layout>
    );
}

function cardStyle(selected: boolean): CSSProperties {
    return {
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: selected ? copyThat.pinkHot : copyThat.line,
        background: selected ? copyThat.pinkWash : copyThat.card,
        borderRadius: 16,
        boxShadow: selected ? '0 10px 28px rgba(226, 24, 108, 0.08)' : 'none',
    };
}
