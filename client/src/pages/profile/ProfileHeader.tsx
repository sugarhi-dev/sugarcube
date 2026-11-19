import { ShareAltOutlined } from '@ant-design/icons';
import type { WorkProfileChoice } from '@sugarcube/schema';
import { Button } from 'antd';
import { ViewingMenu } from './ViewingMenu.tsx';

export function ProfileHeader({
    readOnly,
    heading,
    subtitle,
    showActions,
    viewingLabel,
    canSwitchProfiles,
    choices,
    viewingId,
    switching,
    onShare,
    onViewProfile,
}: {
    readOnly: boolean;
    heading: string;
    subtitle: string | null;
    showActions: boolean;
    viewingLabel: string;
    canSwitchProfiles: boolean;
    choices: WorkProfileChoice[];
    viewingId: string | null;
    switching: boolean;
    onShare: () => void;
    onViewProfile: (id: string) => void;
}) {
    return (
        <>
            {readOnly ? (
                <div className="review-in-review" role="status">
                    <span>
                        Your profile is in review. An administrator will approve it before you go live — usually within 24 hours.
                    </span>
                </div>
            ) : null}
            <div className="crew-intro">
                <div>
                    <h1>{heading}</h1>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                {showActions ? (
                    <div className="review-viewing">
                        <Button
                            htmlType="button"
                            className="review-share"
                            icon={<ShareAltOutlined />}
                            onClick={onShare}
                        >
                            Share profile
                        </Button>
                        {canSwitchProfiles ? (
                            <ViewingMenu
                                label={viewingLabel || 'Your profile'}
                                choices={choices}
                                currentId={viewingId}
                                busy={switching}
                                onSelect={onViewProfile}
                            />
                        ) : (
                            <span className="review-viewing-menu">
                                {viewingLabel || 'Your profile'}
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
        </>
    );
}
