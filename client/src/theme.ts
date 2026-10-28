import type { ThemeConfig } from 'antd';

export const copyThat = {
    canvas: '#faf7f5',
    card: '#ffffff',
    ink: '#1c1c1c',
    muted: '#8a8a8a',
    accent: '#ff3b14',
    pink: '#e2186c',
    pinkHot: '#ff3d82',
    pinkWash: '#fff1f6',
    line: '#efeae6',
    iconIdle: '#f3f0ed',
};

export const copyThatTheme: ThemeConfig = {
    token: {
        colorPrimary: copyThat.pink,
        colorInfo: copyThat.pink,
        colorLink: copyThat.pink,
        colorText: copyThat.ink,
        colorTextSecondary: copyThat.muted,
        colorBgLayout: copyThat.canvas,
        colorBorder: copyThat.line,
        borderRadius: 12,
        fontFamily: 'Inter, "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 15,
    },
    components: {
        Button: {
            controlHeightLG: 48,
            fontWeight: 600,
            primaryShadow: '0 8px 16px rgba(226, 24, 108, 0.16)',
            defaultShadow: 'none',
            borderRadiusLG: 12,
        },
        Card: {
            borderRadiusLG: 16,
        },
    },
};
