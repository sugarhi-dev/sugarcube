import { Typography } from 'antd';
import { useEffect } from 'react';

export function UsersPage() {
    useEffect(() => {
        document.title = 'Users — Sugarcube Admin';
    }, []);

    return <Typography.Title level={3}>Users</Typography.Title>;
}
