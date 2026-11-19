import { App as AntdApp, ConfigProvider } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RequireSession } from './components/RequireSession.tsx';
import { SignedIn } from './components/SignedIn.tsx';
import { CallbackPage } from './pages/CallbackPage.tsx';
import { OnboardingAccountType, onboardingAccountTypePath } from './pages/onboarding/OnboardingAccountType.tsx';
import { OnboardingBasic, onboardingBasicPath } from './pages/onboarding/OnboardingBasic.tsx';
import { OnboardingExperience, onboardingExperiencePath } from './pages/onboarding/OnboardingExperience.tsx';
import { OnboardingMedia, onboardingMediaPath } from './pages/onboarding/OnboardingMedia.tsx';
import { OnboardingProfile, onboardingProfilePath } from './pages/onboarding/OnboardingProfile.tsx';
import { OnboardingReview, onboardingReviewPath } from './pages/onboarding/OnboardingReview.tsx';
import { LandingPage } from './landing/LandingPage.tsx';
import { CalendarPage } from './pages/calendar/CalendarPage.tsx';
import { calendarPath } from './pages/calendar/paths.ts';
import { ProfilePage, profilePath } from './pages/profile/ProfilePage.tsx';
import { settingsPath, settingsSectionPath } from './pages/settings/paths.ts';
import { SettingsPage } from './pages/settings/SettingsPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { copyThatTheme } from './theme.ts';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
    return (
        <ConfigProvider theme={copyThatTheme}>
            <AntdApp>
                <BrowserRouter basename={basename}>
                    <Routes>
                        <Route path="/" element={<SignInPage />} />
                        <Route path="/landing" element={<LandingPage />} />
                        <Route element={<RequireSession><SignedIn /></RequireSession>}>
                            <Route path={profilePath} element={<ProfilePage />} />
                            <Route path={calendarPath} element={<CalendarPage />} />
                            <Route path={settingsPath} element={<Navigate to={settingsSectionPath('personal')} replace />} />
                            <Route path={`${settingsPath}/:section`} element={<SettingsPage />} />
                            <Route path={onboardingAccountTypePath} element={<OnboardingAccountType />} />
                            <Route path={onboardingBasicPath} element={<OnboardingBasic />} />
                            <Route path={onboardingProfilePath} element={<OnboardingProfile />} />
                            <Route path={onboardingExperiencePath} element={<OnboardingExperience />} />
                            <Route path={onboardingMediaPath} element={<OnboardingMedia />} />
                            <Route path={onboardingReviewPath} element={<OnboardingReview />} />
                        </Route>
                        <Route path="/sign-in" element={<SignInPage />} />
                        <Route path="/auth/client/callback" element={<CallbackPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AntdApp>
        </ConfigProvider>
    );
}
