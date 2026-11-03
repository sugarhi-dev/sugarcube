import { EnvironmentOutlined, HomeOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Select, Tag, Typography } from 'antd';
import { useState } from 'react';
import type { ProductionCity } from '../../api/catalog.ts';
import type { SetupCity } from '../../api/me.ts';

export function LocaleField({
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
