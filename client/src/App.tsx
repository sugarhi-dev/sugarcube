import { App as AntdApp, ConfigProvider } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RequireSession } from './components/RequireSession.tsx';
import { CallbackPage } from './pages/CallbackPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
    return (
        <ConfigProvider>
            <AntdApp>
                <BrowserRouter basename={basename}>
                    <Routes>
                        <Route path="/" element={<RequireSession><HomePage /></RequireSession>} />
                        <Route path="/sign-in" element={<SignInPage />} />
                        <Route path="/auth/callback" element={<CallbackPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AntdApp>
        </ConfigProvider>
    );
}
