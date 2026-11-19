import { BankOutlined, EnvironmentOutlined, GlobalOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Form, Input, Select } from 'antd';
import { classifyMediaLink, type Currency } from '@sugarcube/schema';
import type { ProductionCity } from '../../api/catalog.ts';
import { SettingsFooter, SettingsHeading, useSavedClock } from './SettingsFrame.tsx';

const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
};

const roles = [
    'Owner / Executive Producer',
    'Producer',
    'Director',
    'Production Manager',
    'Agency Producer',
    'Brand Producer',
];

const companyTypes = [
    'Production Company',
    'Agency',
    'Brand',
    'Studio',
    'Freelance',
];

const languages = [
    'English (US)',
    'English (UK)',
    'Spanish',
    'Spanish (Mexico)',
    'French',
    'Portuguese',
];

type AdditionalValues = {
    company?: string;
    role?: string;
    companyType?: string;
    website?: string;
    instagram?: string;
    vimeo?: string;
    language?: string;
    currencyId?: string;
    cityId?: string;
};

export type AdditionalSaveInput = {
    cityId: string | null;
    currencyId: string | null;
    vimeoUrl: string;
    unstored: string[];
};

export function AdditionalInfo({
    cities,
    currencies,
    cityId,
    currencyId,
    currencyLocked,
    vimeoUrl,
    hasVimeo,
    saving,
    savedAt,
    onSave,
}: {
    cities: ProductionCity[];
    currencies: Currency[];
    cityId: string | null;
    currencyId: string | null;
    currencyLocked: boolean;
    vimeoUrl: string;
    hasVimeo: boolean;
    saving: boolean;
    savedAt: Date | null;
    onSave: (input: AdditionalSaveInput) => Promise<boolean>;
}) {
    const [form] = Form.useForm<AdditionalValues>();
    useSavedClock(savedAt);
    const cityOptions = [...cities]
        .sort((a, b) => a.name.localeCompare(b.name) || a.country_code.localeCompare(b.country_code))
        .map((city) => ({ value: city.id, label: `${city.name}, ${city.country_code}` }));
    const currencyOptions = [...currencies]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((currency) => ({ value: currency.id, label: currencyLabel(currency) }));

    function onCancel(): void {
        form.setFieldsValue({
            company: '',
            role: undefined,
            companyType: undefined,
            website: '',
            instagram: '',
            language: undefined,
            vimeo: vimeoUrl,
            currencyId: currencyId ?? undefined,
            cityId: cityId ?? undefined,
        });
    }

    async function onFinish(values: AdditionalValues): Promise<void> {
        const vimeo = values.vimeo?.trim() ?? '';
        if (vimeoUrl && !vimeo) {
            form.setFields([{
                name: 'vimeo',
                errors: ["Clearing this doesn't remove the reel from your profile."],
            }]);
            return;
        }
        if (vimeo && vimeo !== vimeoUrl) {
            const link = classifyMediaLink(vimeo);
            if (!link || link.media_type !== 'vimeo') {
                form.setFields([{ name: 'vimeo', errors: ['Enter a Vimeo link, including https://.'] }]);
                return;
            }
            if (!hasVimeo) {
                form.setFields([{
                    name: 'vimeo',
                    errors: ['Add this reel on your profile before saving it here.'],
                }]);
                return;
            }
        }

        const unstored: string[] = [];
        if (values.company?.trim()) {
            unstored.push('Company');
        }
        if (values.role) {
            unstored.push('Role');
        }
        if (values.companyType) {
            unstored.push('Company type');
        }
        if (values.website?.trim()) {
            unstored.push('Website');
        }
        if (values.instagram?.trim()) {
            unstored.push('Instagram');
        }
        if (values.language) {
            unstored.push('Language');
        }

        await onSave({
            cityId: values.cityId ?? null,
            currencyId: values.currencyId ?? null,
            vimeoUrl: vimeo,
            unstored,
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
                initialValues={{
                    company: '',
                    website: '',
                    instagram: '',
                    vimeo: vimeoUrl,
                    currencyId: currencyId ?? undefined,
                    cityId: cityId ?? undefined,
                }}
                onFinish={(values) => void onFinish(values)}
            >
                <Form.Item label={<FieldLabel text="Company" optional />} name="company">
                    <Input prefix={<BankOutlined />} placeholder="Company" />
                </Form.Item>
                <div className="settings-split">
                    <Form.Item label="Your role" name="role">
                        <Select allowClear placeholder="Your role" options={roles.map((role) => ({ value: role, label: role }))} />
                    </Form.Item>
                    <Form.Item label="Company type" name="companyType">
                        <Select
                            allowClear
                            placeholder="Company type"
                            options={companyTypes.map((type) => ({ value: type, label: type }))}
                        />
                    </Form.Item>
                </div>
                <Form.Item label={<FieldLabel text="Website" optional />} name="website">
                    <Input prefix={<GlobalOutlined />} placeholder="sugarhi.tv" />
                </Form.Item>
                <div className="settings-split">
                    <Form.Item label="Instagram" name="instagram">
                        <Input placeholder="@sugarhi.tv" />
                    </Form.Item>
                    <Form.Item label="Vimeo / reel" name="vimeo">
                        <Input prefix={<VideoCameraOutlined />} placeholder="https://vimeo.com/123456789" />
                    </Form.Item>
                </div>
                <div className="settings-split">
                    <Form.Item label="Language" name="language">
                        <Select
                            allowClear
                            placeholder="Language"
                            options={languages.map((language) => ({ value: language, label: language }))}
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
                <Form.Item label="City" name="cityId">
                    <Select
                        showSearch
                        placeholder="City"
                        prefix={<EnvironmentOutlined />}
                        optionFilterProp="label"
                        options={cityOptions}
                    />
                </Form.Item>
                <SettingsFooter savedAt={savedAt} saving={saving} onCancel={onCancel} />
            </Form>
        </>
    );
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
