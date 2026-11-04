import type { ReactNode } from 'react';
import { Flex, Layout } from 'antd';

export function Centered({ children }: { children: ReactNode }) {
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Flex align="center" justify="center" style={{ flex: 1, padding: 24 }}>
                {children}
            </Flex>
        </Layout>
    );
}
