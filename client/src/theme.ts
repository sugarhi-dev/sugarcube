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
        fontFamily: 'var(--font-text)',
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

const fieldBorder = '#dcdcdc';
const fieldHover = '#c4c4c4';
const pinkRing = '0 0 0 2px rgba(226, 24, 108, 0.12)';

export const onboardingTheme: ThemeConfig = {
    token: {
        colorBorder: fieldBorder,
        colorBorderSecondary: '#e8e8e8',
        colorTextSecondary: '#8a837c',
        colorTextPlaceholder: '#b0aaa4',
        colorPrimaryHover: '#c4125c',
        borderRadius: 8,
        controlHeight: 40,
        controlOutline: 'rgba(226, 24, 108, 0.12)',
    },
    components: {
        Button: {
            primaryShadow: 'none',
            defaultShadow: 'none',
            dangerShadow: 'none',
            fontWeight: 650,
            borderRadius: 8,
            controlHeight: 40,
        },
        Input: {
            activeBorderColor: copyThat.pink,
            hoverBorderColor: fieldHover,
            activeShadow: pinkRing,
        },
        InputNumber: {
            activeBorderColor: copyThat.pink,
            hoverBorderColor: fieldHover,
            activeShadow: pinkRing,
        },
        Select: {
            activeBorderColor: copyThat.pink,
            hoverBorderColor: fieldHover,
        },
        Switch: {
            colorPrimary: '#34c759',
            colorPrimaryHover: '#2db84e',
        },
    },
};
