import { BankOutlined, GlobalOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Form, Input, Select } from 'antd';
import {
    userSettingCompanyTypes,
    userSettingLanguages,
    userSettingRoles,
    type Currency,
} from '@sugarcube/schema';
import { SettingsFooter, SettingsHeading, useSavedClock } from './SettingsFrame.tsx';

const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
};

const valueLimit = 255;

type AdditionalValues = {
    company?: string;
    role?: string;
    companyType?: string;
    website?: string;
    instagram?: string;
    vimeo?: string;
    language?: string;
    currencyId?: string;
};

export type AdditionalSettings = {
    company: string;
    role: string;
    companyType: string;
    website: string;
    instagram: string;
    vimeo: string;
    language: string;
};

export type AdditionalSaveInput = {
    settings: AdditionalSettings;
    currencyId: string | null;
};

export function AdditionalInfo({
    settings,
    currencies,
    currencyId,
    currencyLocked,
    saving,
    savedAt,
    onSave,
}: {
    settings: AdditionalSettings;
    currencies: Currency[];
    currencyId: string | null;
    currencyLocked: boolean;
    saving: boolean;
    savedAt: Date | null;
    onSave: (input: AdditionalSaveInput) => Promise<boolean>;
}) {
    const [form] = Form.useForm<AdditionalValues>();
    useSavedClock(savedAt);
    const currencyOptions = [...currencies]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((currency) => ({ value: currency.id, label: currencyLabel(currency) }));

    function onCancel(): void {
        form.setFieldsValue(formValues(settings, currencyId));
    }

    async function onFinish(values: AdditionalValues): Promise<void> {
        await onSave({
            settings: {
                company: values.company?.trim() ?? '',
                role: values.role?.trim() ?? '',
                companyType: values.companyType?.trim() ?? '',
                website: values.website?.trim() ?? '',
                instagram: values.instagram?.trim() ?? '',
                vimeo: values.vimeo?.trim() ?? '',
                language: values.language?.trim() ?? '',
            },
            currencyId: values.currencyId ?? null,
        });
    }

    return (
        <>
            <SettingsHeading
                title="Additional Info"
                lede="Optional details that help collaborators find and trust you — company, links and preferences."
            />
            <Form
                form={form}
                className="settings-form"
                layout="vertical"
                requiredMark={false}
                initialValues={formValues(settings, currencyId)}
                onFinish={(values) => void onFinish(values)}
            >
                <Form.Item label={<FieldLabel text="Company" optional />} name="company">
                    <Input prefix={<BankOutlined />} maxLength={valueLimit} placeholder="Company" />
                </Form.Item>
                <div className="settings-split">
                    <Form.Item label="Your role" name="role">
                        <Select allowClear placeholder="Your role" options={userSettingRoles.map((role) => ({ value: role, label: role }))} />
                    </Form.Item>
                    <Form.Item label="Company type" name="companyType">
                        <Select
                            allowClear
                            placeholder="Company type"
                            options={userSettingCompanyTypes.map((type) => ({ value: type, label: type }))}
                        />
                    </Form.Item>
                </div>
                <Form.Item label={<FieldLabel text="Website" optional />} name="website">
                    <Input prefix={<GlobalOutlined />} maxLength={valueLimit} placeholder="sugarhi.tv" />
                </Form.Item>
                <div className="settings-split">
                    <Form.Item label="Instagram" name="instagram">
                        <Input maxLength={valueLimit} placeholder="@sugarhi.tv" />
                    </Form.Item>
                    <Form.Item label="Vimeo / reel" name="vimeo">
                        <Input prefix={<VideoCameraOutlined />} maxLength={valueLimit} placeholder="https://vimeo.com/123456789" />
                    </Form.Item>
                </div>
                <div className="settings-split">
                    <Form.Item label="Language" name="language">
                        <Select
                            allowClear
                            placeholder="Language"
                            options={userSettingLanguages.map((language) => ({ value: language, label: language }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Currency"
                        name="currencyId"
                        extra={currencyLocked ? 'Currency follows the day rate on your profile.' : undefined}
                    >
                        <Select
                            showSearch
                            disabled={currencyLocked}
                            placeholder="Currency"
                            optionFilterProp="label"
                            options={currencyOptions}
                        />
                    </Form.Item>
                </div>
                <SettingsFooter savedAt={savedAt} saving={saving} onCancel={onCancel} />
            </Form>
        </>
    );
}

function formValues(settings: AdditionalSettings, currencyId: string | null): AdditionalValues {
    return {
        company: settings.company,
        role: settings.role || undefined,
        companyType: settings.companyType || undefined,
        website: settings.website,
        instagram: settings.instagram,
        vimeo: settings.vimeo,
        language: settings.language || undefined,
        currencyId: currencyId ?? undefined,
    };
}

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
    return (
        <span>
            {text}
            {optional ? <span className="settings-optional"> (optional)</span> : null}
        </span>
    );
}

function currencyLabel(currency: Currency): string {
    const symbol = currencySymbols[currency.code];
    return symbol ? `${currency.code} — ${symbol}` : currency.code;
}
