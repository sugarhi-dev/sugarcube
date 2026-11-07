import { crc32, deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { devUser, prepareDevUser } from './reset.ts';

test.beforeEach(async () => {
    await prepareDevUser();
});

test('logs in and completes profile setup', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('sign-in');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Email').fill(devUser.email);
    await page.getByLabel('Password').fill(devUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('radio', { name: /I'm Crew/ }).click();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();

    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await expect(page.getByText('STEP 1 OF 6')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Basic Info' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByText('CREW SETUP')).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue(devUser.firstName);
    await expect(page.getByLabel('Last name')).toHaveValue(devUser.lastName);
    await expect(page.getByLabel('Work email')).toHaveValue(devUser.email);
    await page.getByRole('button', { name: 'Continue — setup' }).click();
    await expect(page.getByText('Enter a phone number with at least 7 digits.')).toBeVisible();
    await expect(page.getByText('Add a title for your profile.')).toBeVisible();
    await expect(page.getByText('Tell us a bit about you.')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();
    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'tiny.png',
        mimeType: 'image/png',
        buffer: solidPng(32, 32),
    });
    await expect(page.getByText('Use a photo at least 400×400px.')).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'portrait.png',
        mimeType: 'image/png',
        buffer: solidPng(400, 400),
    });
    await expect(page.getByRole('img', { name: 'Profile photo' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Phone' }).fill('+52 55 0000 0000');
    await page.getByLabel('Title').fill('Commercial director');
    await page.getByLabel('Bio').fill('Producer and director based in Mexico City — commercials and music videos.');
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PUT' && response.url().includes('/api/me/photo') && response.ok()),
        page.getByRole('button', { name: 'Continue — setup' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveCount(0);
    await expect(page.getByLabel('Last name')).toHaveCount(0);
    await expect(page.getByLabel('Email')).toHaveCount(0);
    await page.locator('.profile-choice').getByText('Shooting', { exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Position' })).toBeEnabled();
    await chooseOption(page, 'Position', 'Director', 'Director');
    await page.getByLabel('Day rate').fill('850');
    await chooseOption(page, 'Currency', 'USD');
    await page.locator('.union-choice').getByText('Non-Union', { exact: true }).click();
    await page.getByRole('switch', { name: 'Would consider flat fee offers' }).click();
    await chooseOption(page, 'Working as a local in', 'Los Angeles, US', 'Los Angeles');
    await page.getByRole('button', { name: 'Continue — experience' }).click();

    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
    await expect(page.locator('.profile-choice .ant-radio-button-wrapper-checked')).toHaveText('Shooting');
    await expect(page.locator('.ant-form-item', { has: page.getByRole('combobox', { name: 'Position' }) })).toContainText('Director');
    await expect(page.getByLabel('Day rate')).toHaveValue(/850/);
    await expect(page.locator('.ant-form-item', { has: page.getByRole('combobox', { name: 'Currency' }) })).toContainText('USD');
    await expect(page.locator('.union-choice .ant-radio-button-wrapper-checked')).toHaveText('Non-Union');
    await expect(page.getByRole('switch', { name: 'Would consider flat fee offers' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Los Angeles is your home city' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Phone' })).toHaveValue('+52 55 0000 0000');
    await expect(page.getByLabel('Title')).toHaveValue('Commercial director');
    await expect(page.getByLabel('Bio')).toHaveValue('Producer and director based in Mexico City — commercials and music videos.');
    await expect(page.getByRole('img', { name: 'Profile photo' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /I'm Crew/ })).toBeChecked();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();
    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue — setup' }).click();
    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue — experience' }).click();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await page.getByLabel('Project title').fill('Nike — Up In The Air');
    await chooseOption(page, 'Position', 'Director', 'Director');
    await page.getByLabel('Lead producer', { exact: true }).fill('Sarah Kim');
    await page.getByLabel('Lead producer email').fill('sarah.kim@example.com');
    await page.getByLabel('Date').fill('2024-03-12');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Nike — Up In The Air')).toBeVisible();
    await expect(page.getByText('Sarah Kim')).toBeVisible();
    await page.getByRole('button', { name: 'Edit Nike — Up In The Air' }).click();
    await page.getByLabel('Lead producer for Nike — Up In The Air', { exact: true }).fill('Jamie Chen');
    await page.getByRole('button', { name: 'Save Nike — Up In The Air' }).click();
    await expect(page.getByText('Jamie Chen')).toBeVisible();
    await expect(page.getByText('Sarah Kim')).toHaveCount(0);
    await page.getByRole('button', { name: 'Remove Nike — Up In The Air' }).click();
    await expect(page.getByText('Nike — Up In The Air')).toHaveCount(0);

    await page.getByLabel('Project title').fill('Adidas — Origami Forever');
    await chooseOption(page, 'Position', 'Director of Photography', 'Photography');
    await page.getByLabel('Lead producer', { exact: true }).fill('Todd Martinez');
    await page.getByLabel('Lead producer email').fill('todd.martinez@example.com');
    await page.getByLabel('Date').fill('2024-03-12');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Adidas — Origami Forever')).toBeVisible();
    await expect(page.getByText('Director of Photography')).toBeVisible();
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PUT' && response.url().includes('/project-types') && response.ok()),
        chooseOption(page, 'Project types', 'Commercial', 'Commercial'),
    ]);
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await fillTrackRecord(page);
    await page.getByRole('button', { name: 'Continue — upload media' }).click();

    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
    await expect(page.getByText('STEP 4 OF 6')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Upload your media' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: 'Add a video' })).toBeVisible();
    await expect(page.getByText('0 of 2 — add 2 more')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByText('Adidas — Origami Forever')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByLabel('Projects completed')).toHaveValue('18');
    await expect(page.getByLabel('Years in the business')).toHaveValue('3');
    await expect(page.locator('.ant-form-item', { has: page.getByRole('combobox', { name: 'Response time' }) })).toContainText('< 12 hours');
    await page.getByRole('button', { name: 'Continue — upload media' }).click();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
});

function solidPng(width: number, height: number): Buffer {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x += 1) {
        row[1 + x * 3] = 0xe2;
        row[2 + x * 3] = 0x18;
        row[3 + x * 3] = 0x6c;
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))),
        pngChunk('IEND', Buffer.alloc(0)),
    ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
    const tag = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
    return Buffer.concat([length, tag, data, crc]);
}

async function fillTrackRecord(page: Page): Promise<void> {
    await page.getByLabel('Projects completed').fill('18');
    await page.getByLabel('Years in the business').fill('3');
    await chooseOption(page, 'Response time', '< 12 hours');
}

async function chooseOption(page: Page, label: string, option: string, search?: string): Promise<void> {
    const combo = page.getByRole('combobox', { name: label });
    await combo.click();
    if (search) {
        await combo.fill(search);
    }
    const choice = page.locator('.ant-select-dropdown:visible .ant-select-item-option-content').getByText(option, { exact: true });
    await choice.click();
}
