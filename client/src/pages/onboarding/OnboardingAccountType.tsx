import { ArrowRightOutlined, CheckOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, ConfigProvider, Flex, Form, Layout, Typography } from 'antd';
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { chooseAccountType, type AccountType } from '../../api/me.ts';
import { beginSignOut } from '../../auth/oidc.ts';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { sessionCleared } from '../../store/sessionSlice.ts';
import { copyThat, onboardingTheme } from '../../theme.ts';
import { onboardingBasicPath } from './OnboardingBasic.tsx';

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
    const savedType = useAppSelector((state) => state.profile.user?.account_type);
    const { message } = AntdApp.useApp();
    const [accountType, setAccountType] = useState<AccountType>(savedType ?? 'client');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        document.title = 'How will you use CopyThat?';
    }, []);

    function signOut(): void {
        if (!session) {
            return;
        }
        dispatch(sessionCleared());
        beginSignOut(session.idToken);
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
            navigate(user.status === 'basic' ? onboardingBasicPath : '/', { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save your account type.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <ConfigProvider theme={onboardingTheme}>
            <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Content style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '18px 22px 22px' }}>
                <Typography.Text
                    style={{
                        color: '#8d8883',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                    }}
                >
                    02 · CHOOSE YOUR PATH
                </Typography.Text>

                <Flex vertical flex="1" style={{ marginTop: 12, background: copyThat.canvas, padding: '26px 32px 40px' }}>
                    <Flex align="center" justify="space-between">
                        <Typography.Title level={4} style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.08em' }}>
                            COPY
                            <Typography.Text style={{ color: copyThat.accent, fontSize: 16, fontWeight: 800, letterSpacing: '0.08em' }}>
                                THAT
                            </Typography.Text>
                        </Typography.Title>
                        <Button type="text" onClick={signOut} style={{ color: '#5c5752', fontWeight: 500 }}>
                            Sign out
                        </Button>
                    </Flex>

                    <Flex vertical style={{ width: 'min(760px, 100%)', margin: '48px auto 0' }}>
                        <Typography.Title level={2} style={{ margin: 0, textAlign: 'center', fontWeight: 700, letterSpacing: '-0.02em' }}>
                            How will you use CopyThat?
                        </Typography.Title>
                        <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 15 }}>
                            Pick one — you can add the other side later.
                        </Typography.Paragraph>

                        <Form
                            onFinish={() => void onFinish()}
                            style={{ marginTop: 28 }}
                            requiredMark={false}
                        >
                            <Flex gap={18} align="stretch" wrap role="radiogroup" aria-label="How will you use CopyThat?">
                                {roles.map((role) => {
                                    const selected = accountType === role.value;
                                    return (
                                        <Flex key={role.value} flex="1 1 280px">
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
                                                styles={{ body: { padding: '20px 20px 18px' } }}
                                            >
                                                <Flex align="flex-start" justify="space-between">
                                                    <Flex
                                                        align="center"
                                                        justify="center"
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 10,
                                                            background: selected ? copyThat.pink : copyThat.iconIdle,
                                                            color: selected ? '#fff' : '#8a8580',
                                                            fontSize: 18,
                                                        }}
                                                    >
                                                        {role.icon}
                                                    </Flex>
                                                    <span aria-hidden style={markStyle(selected)}>
                                                        {selected ? <CheckOutlined style={{ fontSize: 11 }} /> : null}
                                                    </span>
                                                </Flex>
                                                <Typography.Title level={4} style={{ margin: '16px 0 0', fontSize: 18, fontWeight: 700 }}>
                                                    {role.title}
                                                </Typography.Title>
                                                <Typography.Text
                                                    style={{
                                                        display: 'block',
                                                        marginTop: 8,
                                                        color: selected ? copyThat.pink : '#9a9590',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        letterSpacing: '0.08em',
                                                    }}
                                                >
                                                    {role.eyebrow}
                                                </Typography.Text>
                                                <Typography.Paragraph style={{ margin: '8px 0 0', color: '#8a8580', fontSize: 14, lineHeight: 1.45 }}>
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
                                    marginTop: 18,
                                    height: 48,
                                }}
                            >
                                Continue as {accountType === 'client' ? 'Client' : 'Crew'}
                            </Button>
                        </Form>
                        <Typography.Paragraph type="secondary" style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13 }}>
                            You can add another role later from your profile.
                        </Typography.Paragraph>
                    </Flex>
                </Flex>
            </Content>
            </Layout>
        </ConfigProvider>
    );
}

function cardStyle(selected: boolean): CSSProperties {
    return {
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: selected ? copyThat.pink : '#ece7e3',
        background: copyThat.card,
        borderRadius: 14,
        boxShadow: 'none',
    };
}

function markStyle(selected: boolean): CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: `1.5px solid ${selected ? copyThat.pink : '#d5d0cb'}`,
        background: selected ? copyThat.pink : '#fff',
        color: '#fff',
        flex: '0 0 22px',
    };
}
