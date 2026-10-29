import { App as AntdApp, ConfigProvider } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RequireSession } from './components/RequireSession.tsx';
import { SignedIn } from './components/SignedIn.tsx';
import { CallbackPage } from './pages/CallbackPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { OnboardingAccountType, onboardingAccountTypePath } from './pages/onboarding/OnboardingAccountType.tsx';
import { OnboardingExperience, onboardingExperiencePath } from './pages/onboarding/OnboardingExperience.tsx';
import { OnboardingProfile, onboardingProfilePath } from './pages/onboarding/OnboardingProfile.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { copyThatTheme } from './theme.ts';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
    return (
        <ConfigProvider theme={copyThatTheme}>
            <AntdApp>
                <BrowserRouter basename={basename}>
                    <Routes>
                        <Route element={<RequireSession><SignedIn /></RequireSession>}>
                            <Route path="/" element={<HomePage />} />
                            <Route path={onboardingAccountTypePath} element={<OnboardingAccountType />} />
                            <Route path={onboardingProfilePath} element={<OnboardingProfile />} />
                            <Route path={onboardingExperiencePath} element={<OnboardingExperience />} />
                        </Route>
                        <Route path="/sign-in" element={<SignInPage />} />
                        <Route path="/auth/callback" element={<CallbackPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AntdApp>
        </ConfigProvider>
    );
}
