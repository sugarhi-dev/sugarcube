import { EditOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { UnionStatus } from '../../api/me.ts';
import { countLabel, initials, responseLabel, unionLabels } from './profileModel.ts';

export function ProfileAbout({
    readOnly,
    displayName,
    photoUrl,
    onPhotoError,
    firstName,
    lastName,
    unionStatus,
    role,
    where,
    bio,
    onEdit,
}: {
    readOnly: boolean;
    displayName: string;
    photoUrl: string | null;
    onPhotoError: () => void;
    firstName: string;
    lastName: string;
    unionStatus: UnionStatus;
    role: string;
    where: string | null;
    bio: string | null;
    onEdit: () => void;
}) {
    return (
        <>
            <div className="crew-identity">
                <span className="crew-avatar" aria-hidden="true">
                    {photoUrl ? <img src={photoUrl} alt="" onError={onPhotoError} /> : initials(firstName, lastName)}
                </span>
                <div>
                    <div className="crew-name-row">
                        <h2>{displayName}</h2>
                        <span className="crew-union">{unionLabels[unionStatus]}</span>
                        <span className={readOnly ? 'crew-status is-pending' : 'crew-status is-available'}>
                            {readOnly ? 'Pending review' : 'Available now'}
                        </span>
                    </div>
                    {role ? <p className="crew-role">{role}</p> : null}
                    {where ? (
                        <p className="crew-where">
                            <EnvironmentOutlined aria-hidden="true" />
                            {where}
                        </p>
                    ) : null}
                </div>
            </div>
            {bio || !readOnly ? (
                <section className="crew-about" aria-labelledby="crew-about-title">
                    <div className="crew-about-head">
                        <h2 id="crew-about-title">About</h2>
                        {readOnly ? null : (
                            <Button
                                htmlType="button"
                                className="review-edit"
                                aria-label="Edit profile"
                                icon={<EditOutlined />}
                                onClick={onEdit}
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                    {bio ? <p>{bio}</p> : null}
                </section>
            ) : null}
        </>
    );
}

export function ProfileStats({
    projectsCompleted,
    responseTimeHours,
    yearsInBusiness,
    cityCount,
}: {
    projectsCompleted: number | null;
    responseTimeHours: number | null;
    yearsInBusiness: number | null;
    cityCount: number;
}) {
    return (
        <div className="crew-stats">
            <div className="crew-stat">
                <strong>{countLabel(projectsCompleted)}</strong>
                <span>Projects completed</span>
            </div>
            <div className="crew-stat">
                <strong>{responseLabel(responseTimeHours)}</strong>
                <span>Response time</span>
            </div>
            <div className="crew-stat">
                <strong>{countLabel(yearsInBusiness)}</strong>
                <span>Years in the business</span>
            </div>
            <div className="crew-stat">
                <strong>{cityCount}</strong>
                <span>Cities</span>
            </div>
        </div>
    );
}
