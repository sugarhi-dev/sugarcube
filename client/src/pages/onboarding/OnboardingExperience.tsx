import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, Flex, Form, Input, Result, Select, Spin, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    listDisciplines,
    listPositions,
    listProjectTypes,
    type Discipline,
    type Position,
    type ProjectType,
} from '../../api/catalog.ts';
import { completeExperience, returnToStep } from '../../api/me.ts';
import {
    createProject,
    deleteProject,
    listProjectProjectTypes,
    listProjects,
    updateProject,
    updateProjectProjectTypes,
    type Project,
} from '../../api/projects.ts';
import { ProjectCredit, projectFacts } from '../../components/ProjectCredit.tsx';
import { useAppDispatch, useAppSelector, useSession } from '../../store/hooks.ts';
import { profileLoaded } from '../../store/profileSlice.ts';
import { copyThat } from '../../theme.ts';
import { OnboardingFrame } from './OnboardingFrame.tsx';
import { onboardingMediaPath } from './OnboardingMedia.tsx';
import { onboardingProfilePath } from './OnboardingProfile.tsx';
import { ProjectTypeField } from './ProjectTypeField.tsx';

export const onboardingExperiencePath = '/onboarding/experience';

const disciplineOrder = ['Shooting', 'Post Production'];

type ExperienceCatalog = {
    projects: Project[];
    projectTypes: ProjectType[];
    positions: Position[];
    disciplines: Discipline[];
};

type CreditFormValues = {
    name: string;
    position_id: string;
    lead_producer_name: string;
    date: string;
    production_company?: string;
    hiring_producer?: string;
};

export function OnboardingExperience() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const session = useSession();
    const accountType = useAppSelector((state) => state.profile.user?.account_type);
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm<CreditFormValues>();
    const [catalog, setCatalog] = useState<ExperienceCatalog | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const [continuing, setContinuing] = useState(false);
    const [returning, setReturning] = useState(false);
    const selectedTypeIdsRef = useRef<string[]>([]);
    const projectsRef = useRef<Project[]>([]);
    const saveQueue = useRef(Promise.resolve());

    useEffect(() => {
        document.title = 'Experience & project types';
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        const token = session.accessToken;
        let active = true;
        setCatalog(null);
        setCatalogError(null);
        projectsRef.current = [];
        rememberTypeIds(selectedTypeIdsRef, setSelectedTypeIds, []);

        void (async () => {
            try {
                const [projects, projectTypes, positions, disciplines] = await Promise.all([
                    listProjects(token),
                    listProjectTypes(token),
                    listPositions(token),
                    listDisciplines(token),
                ]);
                if (!active) {
                    return;
                }
                if (projectTypes.length === 0 || positions.length === 0 || disciplines.length === 0) {
                    setCatalogError('Experience options are not available yet.');
                    return;
                }
                const links = await Promise.all(projects.map((project) => listProjectProjectTypes(token, project.id)));
                if (!active) {
                    return;
                }
                projectsRef.current = projects;
                rememberTypeIds(
                    selectedTypeIdsRef,
                    setSelectedTypeIds,
                    [...new Set(links.flat().map((link) => link.project_type_id))],
                );
                setCatalog({ projects, projectTypes, positions, disciplines: orderNamed(disciplines, disciplineOrder) });
            } catch (error: unknown) {
                if (active) {
                    setCatalogError(error instanceof Error ? error.message : 'Could not load your experience.');
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [attempt, session]);

    async function onAdd(values: CreditFormValues): Promise<void> {
        if (!session) {
            return;
        }

        setAdding(true);
        try {
            const project = await createProject(session.accessToken, creditInput(values));
            replaceProjects(projectsRef, setCatalog, [...projectsRef.current, project]);
            form.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not add that project.');
            setAdding(false);
            return;
        }

        try {
            await persistProjectTypes(saveQueue, projectsRef, selectedTypeIdsRef, session.accessToken);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update project types.');
        } finally {
            setAdding(false);
        }
    }

    async function onRemove(project: Project): Promise<void> {
        if (!session) {
            return;
        }

        setRemovingId(project.id);
        try {
            await saveQueue.current;
            await deleteProject(session.accessToken, project.id);
            setEditingId((current) => current === project.id ? null : current);
            replaceProjects(
                projectsRef,
                setCatalog,
                projectsRef.current.filter((row) => row.id !== project.id),
            );
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not remove that project.');
        } finally {
            setRemovingId(null);
        }
    }

    async function onSave(project: Project, values: CreditFormValues): Promise<void> {
        if (!session) {
            return;
        }

        setSavingId(project.id);
        try {
            const updated = await updateProject(session.accessToken, project.id, creditInput(values));
            setCatalog((current) => {
                if (!current) {
                    return current;
                }
                const projects = current.projects.map((row) => row.id === updated.id ? updated : row);
                projectsRef.current = projects;
                return { ...current, projects };
            });
            setEditingId(null);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update that project.');
        } finally {
            setSavingId(null);
        }
    }

    function changeTypes(typeIds: string[]): void {
        if (!session) {
            return;
        }

        rememberTypeIds(selectedTypeIdsRef, setSelectedTypeIds, typeIds);
        const token = session.accessToken;
        void persistProjectTypes(saveQueue, projectsRef, selectedTypeIdsRef, token).catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : 'Could not update project types.');
        });
    }

    async function onBack(): Promise<void> {
        if (!session || returning) {
            return;
        }

        setReturning(true);
        try {
            const user = await returnToStep(session.accessToken, 'setup');
            dispatch(profileLoaded({ user, forSubject: session.profile.subject }));
            navigate(onboardingProfilePath);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not go back.');
        } finally {
            setReturning(false);
        }
    }

    async function onContinue(): Promise<void> {
        if (!session) {
            return;
        }

        setContinuing(true);
        try {
            await persistProjectTypes(saveQueue, projectsRef, selectedTypeIdsRef, session.accessToken);
            const user = await completeExperience(session.accessToken);
            dispatch(profileLoaded({ user, forSubject: session.profile.subject }));
            navigate(onboardingMediaPath, { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not continue.');
        } finally {
            setContinuing(false);
        }
    }

    const accountLabel = accountType === 'client' ? 'CLIENT SETUP' : 'CREW SETUP';
    const positionName = new Map(catalog?.positions.map((position) => [position.id, position.name]));
    const positionOptions = catalog ? positionSelectOptions(catalog.disciplines, catalog.positions) : [];

    return (
        <OnboardingFrame
            step={3}
            accountLabel={accountLabel}
            contentWidth={820}
            note="Verified references make your profile rank higher in search."
        >
            <Typography.Text style={{ color: copyThat.pink, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                STEP 3 OF 6
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Experience & project types
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 18px', fontSize: 14 }}>
                Credits live a resume — project, role and lead producer. Producers may be contacted as references.
            </Typography.Paragraph>

            {catalogError ? (
                <Result
                    status="error"
                    title="Could not load your experience"
                    subTitle={catalogError}
                    extra={(
                        <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
                            Try again
                        </Button>
                    )}
                />
            ) : !catalog ? (
                <Spin size="large" description="Loading your experience…" />
            ) : (
                <>
                    <ul className="credit-list">
                        {catalog.projects.map((project) => (
                            editingId === project.id ? (
                                <li key={project.id} className="credit-card is-editing">
                                    <Form
                                        className="review-credit-form"
                                        requiredMark={false}
                                        initialValues={{
                                            name: project.name,
                                            position_id: project.position_id,
                                            lead_producer_name: project.lead_producer_name,
                                            date: project.date,
                                            production_company: project.production_company ?? '',
                                            hiring_producer: project.hiring_producer ?? '',
                                        }}
                                        onFinish={(values: CreditFormValues) => void onSave(project, values)}
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
                                                name="date"
                                                style={{ flex: '0 1 150px', marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Enter a date.' }]}
                                            >
                                                <Input type="date" aria-label={`Date for ${project.name}`} />
                                            </Form.Item>
                                            <Form.Item name="production_company" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                                                <Input aria-label={`Production company for ${project.name}`} placeholder="Production company" />
                                            </Form.Item>
                                            <Form.Item name="hiring_producer" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                                                <Input aria-label={`Hiring producer for ${project.name}`} placeholder="Hiring producer" />
                                            </Form.Item>
                                            <Button
                                                htmlType="submit"
                                                type="text"
                                                aria-label={`Save ${project.name}`}
                                                icon={<CheckOutlined />}
                                                loading={savingId === project.id}
                                            />
                                            <Button
                                                htmlType="button"
                                                type="text"
                                                aria-label={`Remove ${project.name}`}
                                                icon={<DeleteOutlined />}
                                                loading={removingId === project.id}
                                                disabled={savingId === project.id}
                                                onClick={() => void onRemove(project)}
                                            />
                                        </Flex>
                                    </Form>
                                </li>
                            ) : (
                                <ProjectCredit
                                    key={project.id}
                                    name={project.name}
                                    facts={projectFacts({
                                        date: project.date,
                                        position: positionName.get(project.position_id),
                                        company: project.production_company,
                                        hiringProducer: project.hiring_producer,
                                        leadProducer: project.lead_producer_name,
                                    })}
                                    actions={(
                                        <>
                                            <Button
                                                htmlType="button"
                                                type="text"
                                                className="credit-edit"
                                                aria-label={`Edit ${project.name}`}
                                                icon={<EditOutlined />}
                                                onClick={() => setEditingId(project.id)}
                                            />
                                            <Button
                                                htmlType="button"
                                                type="text"
                                                className="credit-remove"
                                                aria-label={`Remove ${project.name}`}
                                                icon={<DeleteOutlined />}
                                                loading={removingId === project.id}
                                                onClick={() => void onRemove(project)}
                                            />
                                        </>
                                    )}
                                />
                            )
                        ))}
                    </ul>

                    <Form
                        form={form}
                        className="credit-form"
                        requiredMark={false}
                        onFinish={(values) => void onAdd(values)}
                    >
                        <Flex gap={8} align="flex-start" wrap="wrap">
                            <Form.Item
                                name="name"
                                style={{ flex: '1.5 1 200px', marginBottom: 0 }}
                                rules={[{ required: true, whitespace: true, message: 'Enter a project title.' }]}
                            >
                                <Input placeholder="Project title" aria-label="Project title" maxLength={255} />
                            </Form.Item>
                            <Form.Item
                                name="position_id"
                                style={{ flex: '1.2 1 180px', marginBottom: 0 }}
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
                                style={{ flex: '1.2 1 180px', marginBottom: 0 }}
                                rules={[{ required: true, whitespace: true, message: 'Enter the lead producer.' }]}
                            >
                                <Input placeholder="Lead producer" aria-label="Lead producer" />
                            </Form.Item>
                            <Form.Item
                                name="date"
                                style={{ flex: '0 1 150px', marginBottom: 0 }}
                                rules={[{ required: true, message: 'Enter a date.' }]}
                            >
                                <Input type="date" aria-label="Date" />
                            </Form.Item>
                            <Form.Item name="production_company" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                                <Input placeholder="Production company" aria-label="Production company" />
                            </Form.Item>
                            <Form.Item name="hiring_producer" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                                <Input placeholder="Hiring producer" aria-label="Hiring producer" />
                            </Form.Item>
                            <Button
                                htmlType="submit"
                                className="experience-add"
                                icon={<PlusOutlined />}
                                loading={adding}
                            >
                                Add
                            </Button>
                        </Flex>
                    </Form>

                    <Typography.Text style={{ display: 'block', marginTop: 36, marginBottom: 12, color: copyThat.pink, fontWeight: 700 }}>
                        What kinds of projects will you work on?
                    </Typography.Text>
                    <ProjectTypeField
                        disciplines={catalog.disciplines}
                        projectTypes={catalog.projectTypes}
                        value={selectedTypeIds}
                        onChange={changeTypes}
                    />

                    <Flex justify="space-between" align="center" style={{ marginTop: 28 }}>
                        <Button
                            type="text"
                            htmlType="button"
                            icon={<ArrowLeftOutlined />}
                            loading={returning}
                            disabled={continuing}
                            onClick={() => void onBack()}
                            style={{ color: copyThat.muted }}
                        >
                            Back
                        </Button>
                        <Button
                            type="primary"
                            htmlType="button"
                            className="profile-continue"
                            loading={continuing}
                            icon={<ArrowRightOutlined />}
                            iconPlacement="end"
                            onClick={() => void onContinue()}
                            style={{
                                background: `linear-gradient(90deg, ${copyThat.pinkHot} 0%, ${copyThat.pink} 100%)`,
                                border: 'none',
                            }}
                        >
                            Continue — upload media
                        </Button>
                    </Flex>
                </>
            )}
        </OnboardingFrame>
    );
}

function creditInput(values: CreditFormValues) {
    return {
        name: values.name.trim(),
        position_id: values.position_id,
        lead_producer_name: values.lead_producer_name.trim(),
        date: values.date,
        production_company: blankToNull(values.production_company),
        hiring_producer: blankToNull(values.hiring_producer),
    };
}

function blankToNull(value: string | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
}

function rememberTypeIds(
    selectedTypeIdsRef: { current: string[] },
    setSelectedTypeIds: (typeIds: string[]) => void,
    typeIds: string[],
): void {
    selectedTypeIdsRef.current = typeIds;
    setSelectedTypeIds(typeIds);
}

function replaceProjects(
    projectsRef: { current: Project[] },
    setCatalog: (update: (current: ExperienceCatalog | null) => ExperienceCatalog | null) => void,
    projects: Project[],
): void {
    projectsRef.current = projects;
    setCatalog((current) => current ? { ...current, projects } : current);
}

function persistProjectTypes(
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
