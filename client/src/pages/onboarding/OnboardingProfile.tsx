import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    EnvironmentOutlined,
    HomeOutlined,
    PhoneOutlined,
    PlaySquareOutlined,
    PlusOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, Flex, Form, Input, InputNumber, Radio, Result, Select, Spin, Switch, Tag, Typography } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
    listCurrencies,
    listDisciplines,
    listPositions,
    listProductionCities,
    type Currency,
    type Discipline,
    type Position,
    type ProductionCity,
} from '../../api/catalog.ts';
import { saveSetup, type SetupCity, type UnionStatus } from '../../api/me.ts';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { copyThat } from '../../theme.ts';
import { OnboardingFrame } from './OnboardingFrame.tsx';

export const onboardingProfilePath = '/onboarding/profile';

const unionOptions: Array<{ value: UnionStatus; label: string }> = [
    { value: 'union', label: 'Union' },
    { value: 'non_union', label: 'Non-Union' },
    { value: 'either', label: 'Either' },
];

const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
};

type Catalog = {
    disciplines: Discipline[];
    positions: Position[];
    currencies: Currency[];
    cities: ProductionCity[];
};

type ProfileFormValues = {
    phone: string;
    discipline_id: string;
    position_id: string;
    day_rate: number | string | null;
    currency_id: string;
    union_status: UnionStatus;
    flat_fee: boolean;
    locales: SetupCity[];
};

export function OnboardingProfile() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const accountType = user?.account_type;
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm<ProfileFormValues>();
    const currencyId = Form.useWatch('currency_id', form);
    const disciplineId = Form.useWatch('discipline_id', form);
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        document.title = 'Set up your profile';
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        const token = session.accessToken;
        let active = true;
        setCatalog(null);
        setCatalogError(null);

        Promise.all([
            listDisciplines(token),
            listPositions(token),
            listCurrencies(token),
            listProductionCities(token),
        ]).then(
            ([disciplines, positions, currencies, cities]) => {
                if (!active) {
                    return;
                }
                if (disciplines.length === 0 || positions.length === 0 || currencies.length === 0 || cities.length === 0) {
                    setCatalogError('Setup options are not available yet.');
                    return;
                }
                setCatalog({
                    disciplines: orderDisciplines(disciplines),
                    positions,
                    currencies,
                    cities,
                });
            },
            (error: unknown) => {
                if (active) {
                    setCatalogError(error instanceof Error ? error.message : 'Could not load setup options.');
                }
            },
        );

        return () => {
            active = false;
        };
    }, [attempt, session]);

    useEffect(() => {
        if (!catalog || !disciplineId) {
            return;
        }
        const positionId = form.getFieldValue('position_id');
        const matches = catalog.positions.some(
            (position) => position.id === positionId && position.discipline_id === disciplineId,
        );
        if (positionId && !matches) {
            form.setFieldValue('position_id', undefined);
        }
    }, [catalog, disciplineId, form]);

    const currencyCode = catalog?.currencies.find((currency) => currency.id === currencyId)?.code;
    const ratePrefix = currencyCode ? (currencySymbols[currencyCode] ?? currencyCode) : undefined;

    async function onFinish(values: ProfileFormValues): Promise<void> {
        if (!session) {
            return;
        }

        const dayRate = readRate(values.day_rate);
        if (dayRate === null) {
            return;
        }

        setSaving(true);
        try {
            const user = await saveSetup(session.accessToken, {
                phone: values.phone.trim(),
                discipline_id: values.discipline_id,
                position_id: values.position_id,
                day_rate: Math.round(dayRate * 100) / 100,
                currency_id: values.currency_id,
                union_status: values.union_status,
                flat_fee: values.flat_fee,
                cities: values.locales,
            });
            dispatch(profileLoaded({ user, forSubject: session.profile.subject }));
            navigate('/', { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save your profile.');
        } finally {
            setSaving(false);
        }
    }

    const accountLabel = accountType === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';

    return (
        <OnboardingFrame step={2} accountLabel={accountLabel}>
            <Typography.Text style={{ color: copyThat.pink, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                STEP 2 OF 5
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Set up your profile
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 18px', fontSize: 14 }}>
                Your discipline, position and rate — this is what clients see and book.
            </Typography.Paragraph>

            {catalogError ? (
                <Result
                    status="error"
                    title="Could not load setup options"
                    subTitle={catalogError}
                    extra={(
                        <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                            Try again
                        </Button>
                    )}
                />
            ) : !catalog ? (
                <Spin size="large" description="Loading setup options…" />
            ) : (
                <Form
                    form={form}
                    className="profile-form"
                    layout="vertical"
                    requiredMark={false}
                    initialValues={{ flat_fee: false, locales: [] }}
                    onFinish={(values) => void onFinish(values)}
                >
                    <Flex gap={12} align="flex-start">
                        <Form.Item label="First name" style={{ flex: 1 }}>
                            <Input readOnly className="profile-readonly" value={user?.first_name ?? ''} />
                        </Form.Item>
                        <Form.Item label="Last name" style={{ flex: 1 }}>
                            <Input readOnly className="profile-readonly" value={user?.last_name ?? ''} />
                        </Form.Item>
                    </Flex>
                    <Form.Item label="Email">
                        <Input readOnly className="profile-readonly" value={user?.email ?? ''} />
                    </Form.Item>

                    <Form.Item
                        label="Discipline"
                        name="discipline_id"
                        rules={[{ required: true, message: 'Choose a discipline.' }]}
                    >
                        <Radio.Group className="profile-choice">
                            {catalog.disciplines.map((discipline) => (
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
                            options={catalog.positions
                                .filter((position) => position.discipline_id === disciplineId)
                                .map((position) => ({ value: position.id, label: position.name }))}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Phone number"
                        name="phone"
                        rules={[{ validator: validatePhone }]}
                    >
                        <Input inputMode="tel" autoComplete="tel" prefix={<PhoneOutlined />} placeholder="+1 213 555 0100" />
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
                                formatter={(value) => formatRate(value)}
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
                                options={catalog.currencies.map((currency) => ({
                                    value: currency.id,
                                    label: currency.code,
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
                        <LocaleField cities={catalog.cities} />
                    </Form.Item>

                    <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
                        <Button type="text" htmlType="button" icon={<ArrowLeftOutlined />} style={{ color: copyThat.muted }}>
                            Back
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="profile-continue"
                            loading={saving}
                            icon={<ArrowRightOutlined />}
                            iconPlacement="end"
                            style={{
                                background: `linear-gradient(90deg, ${copyThat.pinkHot} 0%, ${copyThat.pink} 100%)`,
                                border: 'none',
                            }}
                        >
                            Continue — experience
                        </Button>
                    </Flex>
                </Form>
            )}
        </OnboardingFrame>
    );
}

function LocaleField({
    id,
    cities,
    value = [],
    onChange,
}: {
    id?: string;
    cities: ProductionCity[];
    value?: SetupCity[];
    onChange?: (value: SetupCity[]) => void;
}) {
    const [pickerKey, setPickerKey] = useState(0);
    const selected = new Set(value.map((row) => row.production_city_id));
    const byId = new Map(cities.map((city) => [city.id, city]));
    const options = cities
        .filter((city) => !selected.has(city.id))
        .map((city) => ({ value: city.id, label: `${city.name}, ${city.country_code}` }));

    function addCity(cityId: string): void {
        if (selected.has(cityId)) {
            return;
        }
        const home = value.every((row) => !row.home_city);
        onChange?.([...value, { production_city_id: cityId, home_city: home }]);
        setPickerKey((key) => key + 1);
    }

    function removeCity(cityId: string): void {
        const remaining = value.filter((row) => row.production_city_id !== cityId);
        if (remaining.length > 0 && !remaining.some((row) => row.home_city)) {
            const [first, ...rest] = remaining;
            if (first) {
                onChange?.([{ ...first, home_city: true }, ...rest]);
                return;
            }
        }
        onChange?.(remaining);
    }

    function makeHome(cityId: string): void {
        onChange?.(value.map((row) => ({ ...row, home_city: row.production_city_id === cityId })));
    }

    function openSearch(): void {
        document.querySelector<HTMLInputElement>('.city-search input')?.focus();
    }

    return (
        <Flex vertical gap={10}>
            <div className="city-search">
                <Select
                    id={id}
                    key={pickerKey}
                    showSearch
                    prefix={<EnvironmentOutlined />}
                    placeholder="Search cities..."
                    optionFilterProp="label"
                    options={options}
                    onChange={(cityId) => {
                        if (typeof cityId === 'string') {
                            addCity(cityId);
                        }
                    }}
                    style={{ width: '100%' }}
                />
            </div>
            <Flex gap={8} wrap="wrap" align="center">
                {value.map((row) => {
                    const city = byId.get(row.production_city_id);
                    const name = city?.name ?? 'City';
                    return (
                        <Tag
                            key={row.production_city_id}
                            className={row.home_city ? 'city-tag city-tag-home' : 'city-tag'}
                            closable
                            icon={row.home_city ? <HomeOutlined /> : undefined}
                            onClose={(event) => {
                                event.preventDefault();
                                removeCity(row.production_city_id);
                            }}
                        >
                            <button
                                type="button"
                                className="city-home-hit"
                                aria-pressed={row.home_city}
                                aria-label={row.home_city ? `${name} is your home city` : `Set ${name} as your home city`}
                                onClick={() => makeHome(row.production_city_id)}
                            >
                                {row.home_city ? `${name} · Home` : name}
                            </button>
                        </Tag>
                    );
                })}
                <Button type="dashed" shape="round" className="add-city" icon={<PlusOutlined />} onClick={openSearch}>
                    Add city
                </Button>
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Choose one home city. You can work as a local in the others.
            </Typography.Text>
        </Flex>
    );
}

function disciplineIcon(name: string): ReactNode {
    if (name === 'Shooting') {
        return <VideoCameraOutlined />;
    }
    return <PlaySquareOutlined />;
}

function orderDisciplines(disciplines: Discipline[]): Discipline[] {
    const order = ['Shooting', 'Post Production'];
    return [...disciplines].sort((left, right) => rank(order, left.name) - rank(order, right.name));
}

function rank(order: string[], name: string): number {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
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

function validateRate(_: unknown, value: unknown): Promise<void> {
    if (readRate(value) === null) {
        return Promise.reject(new Error('Enter a day rate.'));
    }
    return Promise.resolve();
}

function readRate(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    }
    return null;
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

function isSetupCity(value: unknown): value is SetupCity {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row.production_city_id === 'string' && typeof row.home_city === 'boolean';
}

function formatRate(value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const [whole, fraction] = String(value).split('.');
    const withCommas = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction !== undefined ? `${withCommas}.${fraction}` : withCommas;
}
