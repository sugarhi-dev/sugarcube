import { App as AntdApp, ConfigProvider } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Navigator } from './components/Navigator.tsx';
import { RequireSession } from './components/RequireSession.tsx';
import { ApprovalsPage } from './pages/ApprovalsPage.tsx';
import { CallbackPage } from './pages/CallbackPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { UserProfilePage } from './pages/UserProfilePage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
    return (
        <ConfigProvider>
            <AntdApp>
                <BrowserRouter basename={basename}>
                    <Routes>
                        <Route element={<RequireSession><Navigator /></RequireSession>}>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/users" element={<UsersPage />} />
                            <Route path="/approvals" element={<ApprovalsPage />} />
                            <Route path="/users/:userId" element={<UserProfilePage />} />
                            <Route path="/projects" element={<ProjectsPage />} />
                        </Route>
                        <Route path="/sign-in" element={<SignInPage />} />
                        <Route path="/auth/admin/callback" element={<CallbackPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AntdApp>
        </ConfigProvider>
    );
}
