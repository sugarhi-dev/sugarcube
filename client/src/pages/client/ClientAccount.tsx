import { ArrowLeftOutlined, ArrowRightOutlined, CameraOutlined, EnvironmentOutlined, MailOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Flex, Form, Input, Select, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { listProductionCities, type ProductionCity } from '../../api/catalog.ts';
import { finishClientAccount, getProfilePhotoUrl, returnToStep, uploadProfilePhoto } from '../../api/me.ts';
import { beginSignOut } from '../../auth/oidc.ts';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { sessionCleared } from '../../store/sessionSlice.ts';
import { copyThat } from '../../theme.ts';
import logoWordmark from '../../landing/assets/logo-wordmark.svg';
import { onboardingAccountTypePath } from '../onboarding/OnboardingAccountType.tsx';
import hero from './assets/client-hero.jpg';
import { clientHomePath } from './paths.ts';
import './client.css';

type ClientFormValues = {
    first_name: string;
    last_name: string;
    email: string;
    production_city_id: string;
};

export function ClientAccount() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm<ClientFormValues>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [cities, setCities] = useState<ProductionCity[]>([]);
    const [saving, setSaving] = useState(false);
    const [returning, setReturning] = useState(false);
    const accessToken = session?.accessToken ?? null;
    const storedPhoto = user?.photo ?? null;

    useEffect(() => {
        document.title = 'Create a client account';
    }, []);

    useEffect(() => {
        if (!accessToken) {
            return;
        }
        let active = true;
        void listProductionCities(accessToken).then((rows) => {
            if (active) {
                setCities([...rows].sort((a, b) => a.name.localeCompare(b.name) || a.country_code.localeCompare(b.country_code)));
            }
        }).catch((error: unknown) => {
            if (active) {
                message.error(error instanceof Error ? error.message : 'Could not load cities.');
            }
        });
        return () => {
            active = false;
        };
    }, [accessToken, message]);

    useEffect(() => {
        if (photoFile) {
            const url = URL.createObjectURL(photoFile);
            setPreview(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        }

        if (!accessToken || !storedPhoto) {
            setPreview(null);
            return;
        }

        let cancelled = false;
        void getProfilePhotoUrl(accessToken).then((link) => {
            if (!cancelled) {
                setPreview(link.url);
            }
        }).catch(() => {
            if (!cancelled) {
                message.error('Could not load your profile photo.');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [accessToken, message, photoFile, storedPhoto]);

    function signOut(): void {
        if (!session) {
            return;
        }
        dispatch(sessionCleared());
        beginSignOut(session.idToken);
    }

    async function choosePhoto(file: File): Promise<void> {
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            message.error('Use a JPG or PNG photo.');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            message.error('Use a photo smaller than 8 MB.');
            return;
        }

        try {
            const bitmap = await createImageBitmap(file);
            const tooSmall = bitmap.width < 400 || bitmap.height < 400;
            bitmap.close();
            if (tooSmall) {
                message.error('Use a photo at least 400×400px.');
                return;
            }
        } catch {
            message.error('Could not read that photo.');
            return;
        }

        setPhotoFile(file);
    }

    async function onBack(): Promise<void> {
        if (!session || returning) {
            return;
        }
        setReturning(true);
        try {
            const saved = await returnToStep(session.accessToken, 'new');
            dispatch(profileLoaded({ user: saved, forSubject: session.profile.subject }));
            navigate(onboardingAccountTypePath);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not go back.');
        } finally {
            setReturning(false);
        }
    }

    async function onFinish(values: ClientFormValues): Promise<void> {
        if (!session) {
            return;
        }
        setSaving(true);
        try {
            if (photoFile) {
                const withPhoto = await uploadProfilePhoto(session.accessToken, photoFile);
                dispatch(profileLoaded({ user: withPhoto, forSubject: session.profile.subject }));
                setPhotoFile(null);
            }
            const saved = await finishClientAccount(session.accessToken, values.production_city_id);
            dispatch(profileLoaded({ user: saved, forSubject: session.profile.subject }));
            navigate(clientHomePath, { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not create your account.');
        } finally {
            setSaving(false);
        }
    }

    const cityOptions = cities.map((city) => ({
        value: city.id,
        label: `${city.name}, ${city.country_code}`,
    }));

    return (
        <div className="client-auth">
            <aside className="client-auth-hero" aria-hidden="true">
                <img src={hero} alt="" />
                <div className="client-auth-hero-copy">
                    <p>Book vetted crew in 40+ cities.</p>
                    <span>Transparent day rates. Union and non-union.</span>
                </div>
            </aside>
            <main className="client-auth-main">
                <header className="client-auth-bar">
                    <img className="client-logo" src={logoWordmark} alt="Sugarcube" width={147} height={26} />
                    <Button type="text" onClick={signOut}>Sign out</Button>
                </header>
                <div className="client-auth-form">
                    <Typography.Title level={2}>Create a client account</Typography.Title>
                    <Typography.Paragraph type="secondary" className="client-auth-lede">
                        Book crew in minutes. Company and billing details come later — only when you book.
                    </Typography.Paragraph>

                    <button
                        type="button"
                        className="basic-photo-pick"
                        aria-label={preview ? 'Change profile photo' : 'Add a profile photo'}
                        onClick={() => fileRef.current?.click()}
                    >
                        <span className="basic-photo-ring">
                            {preview ? <img src={preview} alt="Profile photo" /> : <CameraOutlined />}
                        </span>
                        <span className="basic-photo-copy">
                            <span className="basic-photo-title">Profile photo</span>
                            <span className="basic-photo-hint">JPG or PNG · at least 400×400px</span>
                        </span>
                        <span className="basic-photo-action">{preview ? 'Change photo' : 'Upload'}</span>
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) {
                                void choosePhoto(file);
                            }
                        }}
                    />

                    <Form
                        form={form}
                        className="basic-form"
                        layout="vertical"
                        requiredMark={false}
                        initialValues={{
                            first_name: user?.first_name ?? '',
                            last_name: user?.last_name ?? '',
                            email: user?.email ?? '',
                        }}
                        onFinish={(values) => void onFinish(values)}
                    >
                        <Flex gap={12} wrap="wrap">
                            <Form.Item label="First name" name="first_name" style={{ flex: '1 1 160px' }}>
                                <Input readOnly className="profile-readonly" />
                            </Form.Item>
                            <Form.Item label="Last name" name="last_name" style={{ flex: '1 1 160px' }}>
                                <Input readOnly className="profile-readonly" />
                            </Form.Item>
                        </Flex>
                        <Form.Item label="Work email" name="email">
                            <Input readOnly className="profile-readonly" prefix={<MailOutlined />} />
                        </Form.Item>
                        <Form.Item
                            label="City"
                            name="production_city_id"
                            rules={[{ required: true, message: 'Choose a city.' }]}
                        >
                            <Select
                                showSearch
                                prefix={<EnvironmentOutlined />}
                                placeholder="Mexico City, MX"
                                optionFilterProp="label"
                                options={cityOptions}
                            />
                        </Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            className="client-auth-submit"
                            loading={saving}
                            icon={<ArrowRightOutlined />}
                            iconPlacement="end"
                        >
                            Create account
                        </Button>
                    </Form>
                    <p className="client-auth-terms">By continuing you agree to the Terms and Privacy Policy.</p>
                    <Button
                        type="text"
                        htmlType="button"
                        icon={<ArrowLeftOutlined />}
                        loading={returning}
                        disabled={saving}
                        onClick={() => void onBack()}
                        style={{ color: copyThat.muted, paddingInline: 0 }}
                    >
                        Back
                    </Button>
                </div>
            </main>
        </div>
    );
}
