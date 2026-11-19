import { CameraOutlined, MailOutlined, PhoneOutlined, PlaySquareOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Flex, Form, Input, InputNumber, Radio, Select, Switch, Typography } from 'antd';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LocaleField } from '../onboarding/LocaleField.tsx';
import { currencySymbols, readRate, unionOptions, type ProfileEditValues, type ReviewData } from './profileModel.ts';

const bioLimit = 300;
const titleLimit = 120;

export function ProfileEditor({
    data,
    user,
    photoUrl,
    saving,
    onCancel,
    onSave,
}: {
    data: ReviewData;
    user: { first_name: string; last_name: string; email: string; phone: string | null };
    photoUrl: string | null;
    saving: boolean;
    onCancel: () => void;
    onSave: (values: ProfileEditValues, photoFile: File | null) => void;
}) {
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm<ProfileEditValues>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const currencyId = Form.useWatch('currency_id', form);
    const disciplineId = Form.useWatch('discipline_id', form);
    const currencyCode = data.currencies.find((currency) => currency.id === currencyId)?.code;
    const ratePrefix = currencyCode ? (currencySymbols[currencyCode] ?? currencyCode) : undefined;

    useEffect(() => {
        if (!photoFile) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPreview(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [photoFile]);

    useEffect(() => {
        if (!disciplineId) {
            return;
        }
        const positionId = form.getFieldValue('position_id');
        const matches = data.positions.some(
            (position) => position.id === positionId && position.discipline_id === disciplineId,
        );
        if (positionId && !matches) {
            form.setFieldValue('position_id', undefined);
        }
    }, [data.positions, disciplineId, form]);

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

    const photoSrc = preview ?? photoUrl;

    return (
        <div className="review-editor">
            <button type="button" className="basic-photo-pick" onClick={() => fileRef.current?.click()}>
                <span className="basic-photo-ring">
                    {photoSrc ? <img src={photoSrc} alt="Profile photo" /> : <CameraOutlined />}
                </span>
                <span>
                    <Typography.Text strong style={{ display: 'block', fontSize: 14 }}>
                        Change profile photo
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
                className="profile-form"
                layout="vertical"
                requiredMark={false}
                style={{ marginTop: 16 }}
                initialValues={{
                    phone: user.phone ?? '',
                    title: data.title ?? '',
                    bio: data.bio ?? '',
                    discipline_id: data.disciplineId,
                    position_id: data.positionId,
                    day_rate: data.dayRate ?? undefined,
                    currency_id: data.currencyId ?? undefined,
                    union_status: data.unionStatus,
                    flat_fee: data.flatFee,
                    locales: data.locales,
                }}
                onFinish={(values) => onSave(values, photoFile)}
            >
                <Flex gap={12} wrap="wrap">
                    <Form.Item label="First name" style={{ flex: '1 1 160px' }}>
                        <Input readOnly className="profile-readonly" value={user.first_name} />
                    </Form.Item>
                    <Form.Item label="Last name" style={{ flex: '1 1 160px' }}>
                        <Input readOnly className="profile-readonly" value={user.last_name} />
                    </Form.Item>
                </Flex>
                <Form.Item label="Work email">
                    <Input readOnly className="profile-readonly" prefix={<MailOutlined />} value={user.email} />
                </Form.Item>
                <Form.Item
                    label="Phone"
                    name="phone"
                    rules={[{ validator: validatePhone }]}
                >
                    <Input inputMode="tel" autoComplete="tel" prefix={<PhoneOutlined />} placeholder="+52 55 0000 0000" />
                </Form.Item>
                <Form.Item
                    label="Title"
                    name="title"
                    rules={[
                        { required: true, whitespace: true, message: 'Add a title for your profile.' },
                        { max: titleLimit, message: 'Title must be 120 characters or fewer.' },
                    ]}
                >
                    <Input maxLength={titleLimit} placeholder="Commercial director" />
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
                        rows={4}
                        maxLength={bioLimit}
                        showCount
                    />
                </Form.Item>
                <Form.Item
                    label="Discipline"
                    name="discipline_id"
                    rules={[{ required: true, message: 'Choose a discipline.' }]}
                >
                    <Radio.Group className="profile-choice">
                        {data.disciplines.map((discipline) => (
                            <Radio.Button key={discipline.id} value={discipline.id}>
                                <span className="profile-choice-label">
                                    {disciplineIcon(discipline.name)}
                                    {discipline.name}
                                </span>
                            </Radio.Button>
                        ))}
                    </Radio.Group>
                </Form.Item>
                <Form.Item
                    label="Position"
                    name="position_id"
                    rules={[{ required: true, message: 'Choose a position.' }]}
                >
                    <Select
                        showSearch
                        disabled={!disciplineId}
                        placeholder={disciplineId ? 'Select a position' : 'Choose a discipline first'}
                        optionFilterProp="label"
                        options={data.positions
                            .filter((position) => position.discipline_id === disciplineId)
                            .map((position) => ({ value: position.id, label: position.name }))}
                    />
                </Form.Item>
                <Flex gap={12} align="flex-start" wrap="wrap">
                    <Form.Item
                        label="Day rate"
                        name="day_rate"
                        style={{ flex: '1.4 1 180px' }}
                        rules={[{ validator: validateRate }]}
                    >
                        <InputNumber<string>
                            stringMode
                            min="0"
                            precision={2}
                            controls={false}
                            prefix={ratePrefix}
                            style={{ width: '100%' }}
                            formatter={(value) => formatRateInput(value)}
                            parser={(value) => (value ?? '').replace(/,/g, '')}
                            placeholder="0.00"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Currency"
                        name="currency_id"
                        style={{ flex: '1 1 140px' }}
                        rules={[{ required: true, message: 'Choose a currency.' }]}
                    >
                        <Select
                            placeholder="Currency"
                            options={data.currencies.map((row) => ({
                                value: row.id,
                                label: row.code,
                            }))}
                        />
                    </Form.Item>
                </Flex>
                <Form.Item
                    label="Union status"
                    name="union_status"
                    rules={[{ required: true, message: 'Choose a union status.' }]}
                >
                    <Radio.Group className="union-choice">
                        {unionOptions.map((option) => (
                            <Radio.Button key={option.value} value={option.value}>
                                {option.label}
                            </Radio.Button>
                        ))}
                    </Radio.Group>
                </Form.Item>
                <div className="flat-fee-card">
                    <Flex align="center" justify="space-between" gap={16}>
                        <Flex vertical>
                            <Typography.Text strong>Would consider flat fee offers</Typography.Text>
                            <Typography.Text type="secondary">
                                Clients can offer one project price instead of your day rate.
                            </Typography.Text>
                        </Flex>
                        <Form.Item name="flat_fee" valuePropName="checked" noStyle>
                            <Switch className="flat-fee-switch" aria-label="Would consider flat fee offers" />
                        </Form.Item>
                    </Flex>
                </div>
                <Form.Item
                    label="Working as a local in"
                    name="locales"
                    style={{ marginTop: 8 }}
                    rules={[{ validator: validateLocales }]}
                >
                    <LocaleField cities={data.cities} />
                </Form.Item>
                <div className="review-editor-actions">
                    <Button htmlType="button" disabled={saving} onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        Save profile
                    </Button>
                </div>
            </Form>
        </div>
    );
}

function disciplineIcon(name: string): ReactNode {
    if (name === 'Shooting') {
        return <VideoCameraOutlined />;
    }
    return <PlaySquareOutlined />;
}

function formatRateInput(value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const [whole, fraction] = String(value).split('.');
    const withCommas = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction !== undefined ? `${withCommas}.${fraction}` : withCommas;
}

function validateRate(_: unknown, value: unknown): Promise<void> {
    if (readRate(value) === null) {
        return Promise.reject(new Error('Enter a day rate.'));
    }
    return Promise.resolve();
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

function validateLocales(_: unknown, value: unknown): Promise<void> {
    if (!Array.isArray(value) || value.length === 0) {
        return Promise.reject(new Error('Add at least one city.'));
    }
    const homes = value.filter((row) => isSetupCity(row) && row.home_city);
    if (homes.length !== 1) {
        return Promise.reject(new Error('Choose one home city.'));
    }
    const ids = value.map((row) => (isSetupCity(row) ? row.production_city_id : ''));
    if (new Set(ids).size !== value.length) {
        return Promise.reject(new Error('Each city can only be added once.'));
    }
    return Promise.resolve();
}

function isSetupCity(value: unknown): value is ProfileEditValues['locales'][number] {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row.production_city_id === 'string' && typeof row.home_city === 'boolean';
}
