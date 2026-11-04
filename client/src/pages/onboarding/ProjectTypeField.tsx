import { PlusOutlined, ProjectOutlined } from '@ant-design/icons';
import { Button, Flex, Select, Tag, Typography, type RefSelectProps } from 'antd';
import { useId, useRef, useState } from 'react';
import type { Discipline, ProjectType } from '../../api/catalog.ts';

const disciplineOrder = ['Shooting', 'Post Production'];

const typeOrder: Record<string, string[]> = {
    Shooting: [
        'Social Content',
        'Podcast',
        'Product Demo',
        'Brand Film',
        'Corporate',
        'Tabletop',
        'Fashion',
        'Music Video',
        'Commercial',
        'Event',
        'Sports',
        'Documentary',
        'Unscripted',
        'Feature Film',
        'Short Film',
        'Indie Film',
        'TV Show',
        'Web Series',
        'Longform Art Film',
        'Still Photography',
        'Virtual Production',
    ],
    'Post Production': [
        'Stop Motion',
        'Animated',
        'Motion Graphics',
        'Visual FX',
        'Mixed Media',
        'Experimental',
        'Title Sequence',
        'Trailer',
        'Live Action',
        'AI Content',
    ],
};

export function ProjectTypeField({
    id,
    disciplines,
    projectTypes,
    value = [],
    onChange,
    readOnly = false,
}: {
    id?: string;
    disciplines: Discipline[];
    projectTypes: ProjectType[];
    value?: string[];
    onChange?: (value: string[]) => void;
    readOnly?: boolean;
}) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const selectRef = useRef<RefSelectProps>(null);
    const [pickerKey, setPickerKey] = useState(0);
    const selected = new Set(value);
    const byId = new Map(projectTypes.map((projectType) => [projectType.id, projectType]));
    const disciplineName = new Map(disciplines.map((discipline) => [discipline.id, discipline.name]));
    const options = typeGroups(disciplines, projectTypes.filter((projectType) => !selected.has(projectType.id)))
        .map((group) => ({
            label: group.name,
            options: group.types.map((projectType) => ({ value: projectType.id, label: projectType.name })),
        }));

    function addType(typeId: string): void {
        if (selected.has(typeId)) {
            return;
        }
        onChange?.([...value, typeId]);
        setPickerKey((key) => key + 1);
    }

    function removeType(typeId: string): void {
        onChange?.(value.filter((id) => id !== typeId));
    }

    return (
        <Flex vertical gap={10}>
            {readOnly ? null : (
                <>
                    <label htmlFor={selectId} className="visually-hidden">Project types</label>
                    <Select
                        id={selectId}
                        ref={selectRef}
                        key={pickerKey}
                        showSearch
                        prefix={<ProjectOutlined />}
                        placeholder="Search project types..."
                        optionFilterProp="label"
                        options={options}
                        onChange={(typeId) => {
                            if (typeof typeId === 'string') {
                                addType(typeId);
                            }
                        }}
                        style={{ width: '100%' }}
                    />
                </>
            )}
            <Flex gap={8} wrap="wrap" align="center">
                {value.map((typeId) => {
                    const projectType = byId.get(typeId);
                    const name = projectType?.name ?? 'Project type';
                    const post = disciplineName.get(projectType?.discipline_id ?? '') === 'Post Production';
                    return (
                        <Tag
                            key={typeId}
                            className={post ? 'project-type-tag is-post' : 'project-type-tag'}
                            closable={readOnly ? false : { 'aria-label': `Remove ${name}` }}
                            onClose={(event) => {
                                event.preventDefault();
                                removeType(typeId);
                            }}
                        >
                            {name}
                        </Tag>
                    );
                })}
                {readOnly ? null : (
                    <Button
                        type="dashed"
                        shape="round"
                        className="add-project-type"
                        icon={<PlusOutlined />}
                        onClick={() => selectRef.current?.focus()}
                    >
                        Add project type
                    </Button>
                )}
            </Flex>
            {readOnly ? null : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Pick all that apply. Clients filter crew by project type.
                </Typography.Text>
            )}
        </Flex>
    );
}

function typeGroups(disciplines: Discipline[], projectTypes: ProjectType[]): Array<{
    name: string;
    types: ProjectType[];
}> {
    const ordered = orderNamed(disciplines, disciplineOrder);
    return ordered.flatMap((discipline) => {
        const types = orderNamed(
            projectTypes.filter((projectType) => projectType.discipline_id === discipline.id),
            typeOrder[discipline.name] ?? [],
        );
        if (types.length === 0) {
            return [];
        }
        return [{ name: discipline.name, types }];
    });
}

function orderNamed<T extends { name: string }>(rows: T[], preferred: string[]): T[] {
    return [...rows].sort((left, right) => {
        const leftRank = rank(preferred, left.name);
        const rightRank = rank(preferred, right.name);
        if (leftRank !== rightRank) {
            return leftRank - rightRank;
        }
        return left.name.localeCompare(right.name);
    });
}

function rank(order: string[], name: string): number {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
}
