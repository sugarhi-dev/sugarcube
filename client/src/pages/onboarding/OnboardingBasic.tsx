import { ArrowLeftOutlined, ArrowRightOutlined, CameraOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Flex, Form, Input, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { getProfilePhoto, saveBasic, uploadProfilePhoto } from '../../api/me.ts';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { copyThat } from '../../theme.ts';
import { onboardingAccountTypePath } from './OnboardingAccountType.tsx';
import { OnboardingFrame } from './OnboardingFrame.tsx';
import { onboardingProfilePath } from './OnboardingProfile.tsx';

export const onboardingBasicPath = '/onboarding/basic';

const bioLimit = 300;

type BasicFormValues = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    bio: string;
};

export function OnboardingBasic() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const { message } = AntdApp.useApp();
    const fileRef = useRef<HTMLInputElement>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const accessToken = session?.accessToken ?? null;
    const storedPhoto = user?.photo ?? null;

    useEffect(() => {
        document.title = 'Tell us about you';
    }, []);

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
        let url: string | null = null;
        void getProfilePhoto(accessToken).then((blob) => {
            if (cancelled) {
                return;
            }
            url = URL.createObjectURL(blob);
            setPreview(url);
        }).catch(() => {
            if (!cancelled) {
                message.error('Could not load your profile photo.');
            }
        });

        return () => {
            cancelled = true;
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [accessToken, photoFile, storedPhoto]);

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

    async function onFinish(values: BasicFormValues): Promise<void> {
        if (!session) {
            return;
        }

        setSaving(true);
        try {
            if (photoFile) {
                const withPhoto = await uploadProfilePhoto(session.accessToken, photoFile);
                dispatch(profileLoaded({ user: withPhoto, forSubject: session.profile.subject }));
            }
            const saved = await saveBasic(session.accessToken, {
                phone: values.phone.trim(),
                bio: values.bio.trim(),
            });
            dispatch(profileLoaded({ user: saved, forSubject: session.profile.subject }));
            navigate(onboardingProfilePath, { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save your profile.');
        } finally {
            setSaving(false);
        }
    }

    const accountLabel = user?.account_type === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';

    return (
        <OnboardingFrame step={1} accountLabel={accountLabel}>
            <Typography.Text style={{ color: copyThat.pink, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                STEP 1 OF 5
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Tell us about you
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 14 }}>
                That's it — no company or billing needed for a basic account. Add them later in Settings.
            </Typography.Paragraph>

            <button type="button" className="basic-photo-pick" onClick={() => fileRef.current?.click()}>
                <span className="basic-photo-ring">
                    {preview ? <img src={preview} alt="Profile photo" /> : <CameraOutlined />}
                </span>
                <span>
                    <Typography.Text strong style={{ display: 'block', fontSize: 14 }}>
                        {preview ? 'Change profile photo' : 'Add a profile photo'}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        JPG or PNG · at least 400×400px
                    </Typography.Text>
                </span>
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
                className="basic-form"
                layout="vertical"
                requiredMark={false}
                initialValues={{
                    first_name: user?.first_name ?? '',
                    last_name: user?.last_name ?? '',
                    email: user?.email ?? '',
                    phone: user?.phone ?? '',
                    bio: user?.bio ?? '',
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
                    label="Phone"
                    name="phone"
                    rules={[{ validator: validatePhone }]}
                >
                    <Input inputMode="tel" autoComplete="tel" prefix={<PhoneOutlined />} placeholder="+52 55 0000 0000" />
                </Form.Item>
                <Form.Item
                    label="Bio"
                    name="bio"
                    rules={[
                        { required: true, whitespace: true, message: 'Tell us a bit about you.' },
                        { max: bioLimit, message: 'Bio must be 300 characters or fewer.' },
                    ]}
                >
                    <Input.TextArea
                        className="basic-bio"
                        rows={5}
                        maxLength={bioLimit}
                        placeholder="Producer & director based in Mexico City — commercials and music videos for global brands."
                        showCount={{
                            formatter: ({ count, maxLength }) =>
                                `${count.toLocaleString('en-US')} / ${(maxLength ?? bioLimit).toLocaleString('en-US')}`,
                        }}
                    />
                </Form.Item>
                <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
                    <Button
                        type="text"
                        htmlType="button"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(onboardingAccountTypePath)}
                        style={{ color: copyThat.muted }}
                    >
                        Back
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        className="basic-finish"
                        loading={saving}
                        icon={<ArrowRightOutlined />}
                        iconPlacement="end"
                    >
                        Continue — setup
                    </Button>
                </Flex>
            </Form>
        </OnboardingFrame>
    );
}

function validatePhone(_: unknown, value: unknown): Promise<void> {
    if (typeof value === 'string' && isPhone(value.trim())) {
        return Promise.resolve();
    }
    return Promise.reject(new Error('Enter a phone number with at least 7 digits.'));
}

function isPhone(phone: string): boolean {
    return /^[0-9+().\-\s]+$/.test(phone) && (phone.match(/\d/g)?.length ?? 0) >= 7;
}
