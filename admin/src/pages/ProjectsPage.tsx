import { Typography } from 'antd';
import { useEffect } from 'react';

export function ProjectsPage() {
    useEffect(() => {
        document.title = 'Projects — Sugarcube Admin';
    }, []);

    return <Typography.Title level={3}>Projects</Typography.Title>;
}
