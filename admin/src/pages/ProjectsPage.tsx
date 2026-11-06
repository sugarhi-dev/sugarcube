import { useEffect } from 'react';

export function ProjectsPage() {
    useEffect(() => {
        document.title = 'Projects — Sugarcube Admin';
    }, []);

    return null;
}
