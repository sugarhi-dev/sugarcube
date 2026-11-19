import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { Project, ProjectType } from '@sugarcube/schema';
import { App as AntdApp, Button, Flex, Form, Input, Select, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { Discipline, Position } from '../../api/catalog.ts';
import { createProject, deleteProject, updateProject, updateProjectProjectTypes } from '../../api/projects.ts';
import { ProjectCredit, projectFacts } from '../../components/ProjectCredit.tsx';
import { ProjectTypeField } from '../onboarding/ProjectTypeField.tsx';

type CreditFormValues = {
    name: string;
    position_id: string;
    lead_producer_name: string;
    lead_producer_email: string;
    date: string;
    production_company?: string;
};

const leadProducerEmailRules = [
    { required: true, whitespace: true, message: 'Enter the lead producer email.' },
    { type: 'email' as const, message: 'Enter a valid email address.' },
];

export function PastExperience({
    readOnly,
    projects,
    disciplines,
    positions,
    projectTypes,
    selectedTypeIds,
    accessToken,
    projectsRef,
    selectedTypeIdsRef,
    saveQueue,
    onProjects,
    onTypeIds,
}: {
    readOnly: boolean;
    projects: Project[];
    disciplines: Discipline[];
    positions: Position[];
    projectTypes: ProjectType[];
    selectedTypeIds: string[];
    accessToken: string;
    projectsRef: { current: Project[] };
    selectedTypeIdsRef: { current: string[] };
    saveQueue: { current: Promise<void> };
    onProjects: (next: Project[]) => void;
    onTypeIds: (typeIds: string[]) => void;
}) {
    const { message } = AntdApp.useApp();
    const [creditForm] = Form.useForm<CreditFormValues>();
    const [addingCredit, setAddingCredit] = useState(false);
    const [editingCreditId, setEditingCreditId] = useState<string | null>(null);
    const [editingExperience, setEditingExperience] = useState(false);
    const addCreditTitleRef = useRef<InputRef>(null);
    const [savingCreditId, setSavingCreditId] = useState<string | null>(null);
    const [removingCreditId, setRemovingCreditId] = useState<string | null>(null);
    const positionOptions = positionSelectOptions(disciplines, positions);
    const positionById = new Map(positions.map((position) => [position.id, position.name]));

    useEffect(() => {
        if (editingExperience) {
            addCreditTitleRef.current?.focus();
        }
    }, [editingExperience]);

    async function onAddCredit(values: CreditFormValues): Promise<void> {
        setAddingCredit(true);
        try {
            const project = await createProject(accessToken, creditInput(values));
            onProjects([...projectsRef.current, project]);
            creditForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not add that project.');
            setAddingCredit(false);
            return;
        }
        try {
            await persistTypes(saveQueue, projectsRef, selectedTypeIdsRef, accessToken);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update project types.');
        } finally {
            setAddingCredit(false);
        }
    }

    async function onSaveCredit(project: Project, values: CreditFormValues): Promise<void> {
        setSavingCreditId(project.id);
        try {
            const updated = await updateProject(accessToken, project.id, creditInput(values));
            onProjects(projectsRef.current.map((row) => row.id === updated.id ? updated : row));
            setEditingCreditId(null);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update that project.');
        } finally {
            setSavingCreditId(null);
        }
    }

    async function onRemoveCredit(project: Project): Promise<void> {
        setRemovingCreditId(project.id);
        try {
            await saveQueue.current;
            await deleteProject(accessToken, project.id);
            setEditingCreditId((current) => current === project.id ? null : current);
            onProjects(projectsRef.current.filter((row) => row.id !== project.id));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not remove that project.');
        } finally {
            setRemovingCreditId(null);
        }
    }

    function changeTypes(typeIds: string[]): void {
        onTypeIds(typeIds);
        void persistTypes(saveQueue, projectsRef, selectedTypeIdsRef, accessToken).catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : 'Could not update project types.');
        });
    }

    return (
        <section className="crew-panel" aria-labelledby="crew-experience-title">
            <div className="crew-panel-head">
                <h2 id="crew-experience-title">Past experience</h2>
                {readOnly ? <span className="review-verified">Verified by reference</span> : (
                    <Button
                        htmlType="button"
                        className="review-edit"
                        icon={editingExperience ? <CheckOutlined /> : <EditOutlined />}
                        aria-expanded={editingExperience}
                        aria-controls="past-experience-add"
                        aria-label={editingExperience ? 'Done editing past experience' : 'Edit past experience'}
                        onClick={() => setEditingExperience((current) => !current)}
                    >
                        {editingExperience ? 'Done' : 'Edit'}
                    </Button>
                )}
            </div>
            {projects.length === 0 ? (
                <p className="review-empty-copy">
                    {readOnly ? 'No credits yet.' : 'Add a credit so clients can see where you have worked.'}
                </p>
            ) : (
                <ul className="credit-list">
                    {projects.map((project) => (
                        !readOnly && editingCreditId === project.id ? (
                            <li key={project.id} className="credit-plain is-editing">
                                <Form
                                    className="review-credit-form"
                                    requiredMark={false}
                                    initialValues={{
                                        name: project.name,
                                        position_id: project.position_id,
                                        lead_producer_name: project.lead_producer_name,
                                        lead_producer_email: project.lead_producer_email ?? '',
                                        date: project.date,
                                        production_company: project.production_company ?? '',
                                    }}
                                    onFinish={(values: CreditFormValues) => void onSaveCredit(project, values)}
                                >
                                    <Form.Item
                                        name="name"
                                        style={{ marginBottom: 8 }}
                                        rules={[{ required: true, whitespace: true, message: 'Enter a project title.' }]}
                                    >
                                        <Input
                                            autoFocus
                                            aria-label={`Project title for ${project.name}`}
                                            maxLength={255}
                                        />
                                    </Form.Item>
                                    <Flex gap={8} wrap="wrap" align="flex-start">
                                        <Form.Item
                                            name="position_id"
                                            style={{ flex: '1 1 180px', marginBottom: 0 }}
                                            rules={[{ required: true, message: 'Choose a position.' }]}
                                        >
                                            <Select
                                                showSearch
                                                popupMatchSelectWidth={false}
                                                aria-label={`Position for ${project.name}`}
                                                placeholder="Position"
                                                optionFilterProp="label"
                                                options={positionOptions}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name="lead_producer_name"
                                            style={{ flex: '1 1 180px', marginBottom: 0 }}
                                            rules={[{ required: true, whitespace: true, message: 'Enter the lead producer.' }]}
                                        >
                                            <Input aria-label={`Lead producer for ${project.name}`} />
                                        </Form.Item>
                                        <Form.Item
                                            name="lead_producer_email"
                                            style={{ flex: '1 1 200px', marginBottom: 0 }}
                                            rules={leadProducerEmailRules}
                                        >
                                            <Input
                                                type="email"
                                                inputMode="email"
                                                autoComplete="off"
                                                aria-label={`Lead producer email for ${project.name}`}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name="date"
                                            style={{ flex: '0 1 150px', marginBottom: 0 }}
                                            rules={[{ required: true, message: 'Enter a date.' }]}
                                        >
                                            <Input type="date" aria-label={`Date for ${project.name}`} />
                                        </Form.Item>
                                        <Form.Item name="production_company" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                                            <Input aria-label={`Production company for ${project.name}`} placeholder="Production company" />
                                        </Form.Item>
                                        <Button
                                            htmlType="submit"
                                            type="text"
                                            aria-label={`Save ${project.name}`}
                                            icon={<CheckOutlined />}
                                            loading={savingCreditId === project.id}
                                        />
                                        <Button
                                            htmlType="button"
                                            type="text"
                                            aria-label={`Remove ${project.name}`}
                                            icon={<DeleteOutlined />}
                                            loading={removingCreditId === project.id}
                                            disabled={savingCreditId === project.id}
                                            onClick={() => void onRemoveCredit(project)}
                                        />
                                    </Flex>
                                </Form>
                            </li>
                        ) : (
                            <ProjectCredit
                                key={project.id}
                                boxed={false}
                                name={project.name}
                                status="Reference pending"
                                facts={projectFacts({
                                    date: project.date,
                                    position: positionById.get(project.position_id),
                                    company: project.production_company,
                                    leadProducer: project.lead_producer_name,
                                    leadProducerEmail: project.lead_producer_email,
                                })}
                                actions={readOnly ? undefined : (
                                    <>
                                        <Button
                                            htmlType="button"
                                            type="text"
                                            className="credit-edit"
                                            aria-label={`Edit ${project.name}`}
                                            icon={<EditOutlined />}
                                            onClick={() => setEditingCreditId(project.id)}
                                        />
                                        <Button
                                            htmlType="button"
                                            type="text"
                                            className="credit-remove"
                                            aria-label={`Remove ${project.name}`}
                                            icon={<DeleteOutlined />}
                                            loading={removingCreditId === project.id}
                                            onClick={() => void onRemoveCredit(project)}
                                        />
                                    </>
                                )}
                            />
                        )
                    ))}
                </ul>
            )}

            {readOnly || !editingExperience ? null : (
                <Form
                    form={creditForm}
                    className="review-experience-add"
                    id="past-experience-add"
                    requiredMark={false}
                    onFinish={(values) => void onAddCredit(values)}
                >
                    <Flex gap={8} align="flex-start" wrap="wrap">
                        <Form.Item
                            name="name"
                            style={{ flex: '1.4 1 180px', marginBottom: 0 }}
                            rules={[{ required: true, whitespace: true, message: 'Enter a project title.' }]}
                        >
                            <Input ref={addCreditTitleRef} placeholder="Project title" aria-label="Project title" maxLength={255} />
                        </Form.Item>
                        <Form.Item
                            name="position_id"
                            style={{ flex: '1 1 160px', marginBottom: 0 }}
                            rules={[{ required: true, message: 'Choose a position.' }]}
                        >
                            <Select
                                showSearch
                                popupMatchSelectWidth={false}
                                aria-label="Position"
                                placeholder="Position"
                                optionFilterProp="label"
                                options={positionOptions}
                            />
                        </Form.Item>
                        <Form.Item
                            name="lead_producer_name"
                            style={{ flex: '1 1 160px', marginBottom: 0 }}
                            rules={[{ required: true, whitespace: true, message: 'Enter the lead producer.' }]}
                        >
                            <Input placeholder="Lead producer" aria-label="Lead producer" />
                        </Form.Item>
                        <Form.Item
                            name="lead_producer_email"
                            style={{ flex: '1 1 180px', marginBottom: 0 }}
                            rules={leadProducerEmailRules}
                        >
                            <Input
                                type="email"
                                inputMode="email"
                                autoComplete="off"
                                placeholder="Lead producer email"
                                aria-label="Lead producer email"
                            />
                        </Form.Item>
                        <Form.Item
                            name="date"
                            style={{ flex: '0 1 150px', marginBottom: 0 }}
                            rules={[{ required: true, message: 'Enter a date.' }]}
                        >
                            <Input type="date" aria-label="Date" />
                        </Form.Item>
                        <Form.Item name="production_company" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                            <Input placeholder="Production company" aria-label="Production company" />
                        </Form.Item>
                        <Button htmlType="submit" className="experience-add" icon={<PlusOutlined />} loading={addingCredit}>
                            Add credit
                        </Button>
                    </Flex>
                </Form>
            )}

            <Typography.Text className="review-types-label">Project types</Typography.Text>
            <div style={{ marginTop: 8 }}>
                <ProjectTypeField
                    disciplines={disciplines}
                    projectTypes={projectTypes}
                    value={selectedTypeIds}
                    onChange={changeTypes}
                    readOnly={readOnly}
                    showPicker={editingExperience}
                />
            </div>
        </section>
    );
}

function persistTypes(
    saveQueue: { current: Promise<void> },
    projectsRef: { current: Project[] },
    selectedTypeIdsRef: { current: string[] },
    accessToken: string,
): Promise<void> {
    const run = saveQueue.current.then(async () => {
        const typeIds = selectedTypeIdsRef.current;
        await Promise.all(projectsRef.current.map((project) => updateProjectProjectTypes(accessToken, project.id, typeIds)));
    });
    saveQueue.current = run.then(() => undefined, () => undefined);
    return run;
}

function creditInput(values: CreditFormValues) {
    return {
        name: values.name.trim(),
        position_id: values.position_id,
        lead_producer_name: values.lead_producer_name.trim(),
        lead_producer_email: values.lead_producer_email.trim(),
        date: values.date,
        production_company: blankToNull(values.production_company),
    };
}

function blankToNull(value: string | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
}

function positionSelectOptions(disciplines: Discipline[], positions: Position[]): Array<{
    label: string;
    options: Array<{ value: string; label: string }>;
}> {
    return disciplines.map((discipline) => ({
        label: discipline.name,
        options: positions
            .filter((position) => position.discipline_id === discipline.id)
            .map((position) => ({ value: position.id, label: position.name })),
    }));
}
