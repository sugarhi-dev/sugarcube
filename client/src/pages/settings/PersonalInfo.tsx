import { CameraOutlined, CheckOutlined, EnvironmentOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Form, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { ProductionCity } from '../../api/catalog.ts';
import type { CurrentUser } from '../../api/me.ts';
import { SettingsFooter, SettingsHeading, useSavedClock } from './SettingsFrame.tsx';

const bioLimit = 300;

type PersonalValues = {
    phone: string;
    bio: string;
    cityId?: string;
};

export type PersonalSaveInput = {
    phone: string;
    bio: string;
    cityId: string | null;
};

export type PersonalSaveResult = {
    ok: boolean;
    photoSaved: boolean;
};

export function PersonalInfo({
    user,
    photoUrl,
    cities,
    cityId,
    saving,
    savedAt,
    onSave,
}: {
    user: CurrentUser;
    photoUrl: string | null;
    cities: ProductionCity[];
    cityId: string | null;
    saving: boolean;
    savedAt: Date | null;
    onSave: (input: PersonalSaveInput, photo: File | null) => Promise<PersonalSaveResult>;
}) {
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm<PersonalValues>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const bio = Form.useWatch('bio', form) ?? '';
    useSavedClock(savedAt);

    useEffect(() => {
        if (!photoFile) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    const shown = preview ?? photoUrl;
    const cityOptions = [...cities]
        .sort((a, b) => a.name.localeCompare(b.name) || a.country_code.localeCompare(b.country_code))
        .map((city) => ({ value: city.id, label: `${city.name}, ${city.country_code}` }));

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

    function onRemove(): void {
        if (photoFile) {
            setPhotoFile(null);
            return;
        }
        message.info('Profile photos can be replaced, not removed.');
    }

    function onCancel(): void {
        form.setFieldsValue({
            phone: user.phone ?? '',
            bio: user.bio ?? '',
            cityId: cityId ?? undefined,
        });
        setPhotoFile(null);
    }

    async function onFinish(values: PersonalValues): Promise<void> {
        const phone = values.phone.trim();
        const nextBio = values.bio.trim();
        const phoneChanged = phone !== (user.phone ?? '').trim();
        const bioChanged = nextBio !== (user.bio ?? '').trim();
        if (phoneChanged || bioChanged) {
            const errors: Array<{ name: 'phone' | 'bio'; errors: string[] }> = [];
            if (!isPhone(phone)) {
                errors.push({ name: 'phone', errors: ['Enter a phone number with at least 7 digits.'] });
            }
            if (!nextBio) {
                errors.push({ name: 'bio', errors: ['Tell us a bit about you.'] });
            } else if (nextBio.length > bioLimit) {
                errors.push({ name: 'bio', errors: ['Bio must be 300 characters or fewer.'] });
            }
            if (errors.length > 0) {
                form.setFields(errors);
                return;
            }
        }

        const result = await onSave({
            phone,
            bio: nextBio,
            cityId: values.cityId ?? null,
        }, photoFile);
        if (result.photoSaved) {
            setPhotoFile(null);
        }
    }

    return (
        <>
            <SettingsHeading
                title="Personal Info"
                lede="Providing more information about yourself will increase the number of inquiries and responses from other users."
            />
            <p className="settings-label">Profile photo</p>
            <div className="settings-photo">
                <span className="settings-photo-mark" aria-hidden="true">
                    {shown ? <img src={shown} alt="" /> : initials(user.first_name, user.last_name)}
                </span>
                <span className="settings-photo-actions">
                    <Button htmlType="button" icon={<CameraOutlined />} onClick={() => fileRef.current?.click()}>
                        Upload image
                    </Button>
                    <span className="settings-photo-hint">JPG or PNG · at least 400×400px</span>
                    {shown ? (
                        <button type="button" className="settings-photo-remove" onClick={onRemove}>
                            Remove photo
                        </button>
                    ) : null}
                </span>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                aria-label="Profile photo file"
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
                className="settings-form"
                layout="vertical"
                requiredMark={false}
                initialValues={{
                    phone: user.phone ?? '',
                    bio: user.bio ?? '',
                    cityId: cityId ?? undefined,
                }}
                onFinish={(values) => void onFinish(values)}
            >
                <div className="settings-split">
                    <Form.Item label="First name">
                        <Input readOnly className="profile-readonly" value={user.first_name} />
                    </Form.Item>
                    <Form.Item label="Last name">
                        <Input readOnly className="profile-readonly" value={user.last_name} />
                    </Form.Item>
                </div>
                <Form.Item label="Work email">
                    <Input
                        readOnly
                        className="profile-readonly"
                        prefix={<MailOutlined />}
                        suffix={(
                            <span className="settings-verified">
                                <CheckOutlined />
                                Verified
                            </span>
                        )}
                        value={user.email}
                    />
                </Form.Item>
                <Form.Item label="Cell phone" name="phone">
                    <PhoneField />
                </Form.Item>
                <Form.Item label="City" name="cityId">
                    <Select
                        showSearch
                        placeholder="City"
                        prefix={<EnvironmentOutlined />}
                        optionFilterProp="label"
                        options={cityOptions}
                    />
                </Form.Item>
                <Form.Item label="Bio" name="bio">
                    <Input.TextArea
                        rows={4}
                        maxLength={bioLimit}
                        placeholder="Producer & director based in Mexico City — commercials and music videos for global brands."
                    />
                </Form.Item>
                <p className="settings-count">
                    {bio.length.toLocaleString('en-US')} / {bioLimit.toLocaleString('en-US')}
                </p>
                <SettingsFooter savedAt={savedAt} saving={saving} onCancel={onCancel} />
            </Form>
        </>
    );
}

function PhoneField({
    id,
    value,
    onChange,
}: {
    id?: string;
    value?: string;
    onChange?: (value: string) => void;
}) {
    const { message } = AntdApp.useApp();
    return (
        <div className="settings-phone">
            <Input
                id={id}
                inputMode="tel"
                autoComplete="tel"
                prefix={<PhoneOutlined />}
                placeholder="+52 55 0000 0000"
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
            />
            <button
                type="button"
                className="settings-verify"
                onClick={() => message.info("Phone verification isn't available yet.")}
            >
                Verify
            </button>
        </div>
    );
}

function isPhone(phone: string): boolean {
    return /^[0-9+().\-\s]+$/.test(phone) && (phone.match(/\d/g)?.length ?? 0) >= 7;
}

function initials(first: string, last: string): string {
    const mark = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
    return mark || '?';
}
