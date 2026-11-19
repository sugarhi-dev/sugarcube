import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, ConfigProvider } from 'antd';
import { useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { Frame } from '../../components/Frame.tsx';
import { useAppSelector } from '../../store/hooks.ts';
import { onboardingTheme } from '../../theme.ts';
import { ProfilePage, profilePath } from '../profile/ProfilePage.tsx';

export const onboardingReviewPath = '/onboarding/review';

export function OnboardingReview() {
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.profile.user);
    const readOnly = user?.status === 'admin-review';

    useEffect(() => {
        document.title = readOnly ? 'Profile in review' : 'Review & go live';
    }, [readOnly]);

    const sheet = (
        <div className="review-sheet">
            {readOnly ? null : (
                <p className="review-client-note">
                    <InfoCircleOutlined aria-hidden="true" />
                    This is exactly what clients will see. Edit anything inline, then submit for review.
                </p>
            )}
            <ProfilePage onboarding />
        </div>
    );

    if (readOnly) {
        return (
            <ConfigProvider theme={onboardingTheme}>
                <Frame>
                    <div className="setup-progress" style={{ '--onboarding-progress': 5 } as CSSProperties} aria-hidden="true" />
                    {sheet}
                </Frame>
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider theme={onboardingTheme}>
            <div className="review-stage" style={{ '--onboarding-progress': 4 } as CSSProperties}>
                <header className="review-top">
                    <div>
                        <span className="review-step">STEP 5 OF 6</span>
                        <span className="review-step-name">Review & go live</span>
                    </div>
                    <Button htmlType="button" type="text" className="review-exit" onClick={() => navigate(profilePath)}>
                        Save & exit
                    </Button>
                </header>
                {sheet}
            </div>
        </ConfigProvider>
    );
}
