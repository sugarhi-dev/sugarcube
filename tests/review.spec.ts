import { crc32, deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { devUser, prepareDevUser } from './reset.ts';

const thumbnail = {
    name: 'thumb.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAASACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiaKKK7T+lgooooAKKKKACiiigD//Z',
        'base64',
    ),
};

const videoUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=jNQXAC9IVRw',
];

test.beforeEach(async () => {
    await prepareDevUser();
});

test('reviews the crew profile and submits it', async ({ page }) => {
    test.setTimeout(120_000);
    await openMedia(page);

    const continueReview = page.getByRole('button', { name: 'Continue — review' });
    await expect(continueReview).toBeDisabled();
    await expect(page.getByText('0 of 2 — add 2 more')).toBeVisible();

    for (const url of videoUrls) {
        await addLink(page, url);
    }
    await expect(page.locator('.media-count')).toHaveText('2 of 2');
    await expect(continueReview).toBeEnabled();

    const advanced = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith('/api/me/media') && response.ok());
    await continueReview.click();
    expect((await advanced).status()).toBe(200);
    await expectReview(page);
    const avatar = page.locator('.crew-avatar img');
    await expect(avatar).toHaveAttribute('src', /^\/content\//);
    await expect(avatar).toHaveJSProperty('naturalWidth', 400);
    await expect(page.getByRole('heading', { name: 'Director' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Sugarhi' })).toBeVisible();
    await expect(page.getByText('Worked on Nike — Up In The Air.')).toBeVisible();
    await expect(page.getByText('Union', { exact: true })).toBeVisible();
    await expect(page.getByText('$2,000 per day')).toBeVisible();
    await expect(page.getByText('Local in Mexico City · Los Angeles')).toBeVisible();
    await expect(page.getByText('Producer and director based in Mexico City.')).toBeVisible();
    await expect(page.getByText('Nike — Up In The Air', { exact: true })).toBeVisible();
    await expect(page.getByText('Sarah Kim')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Music Video' })).toBeVisible();
    const tiles = page.locator('.crew-tile');
    await expect(tiles).toHaveCount(2);
    await expect(page.locator('.crew-tile iframe')).toHaveCount(0);
    await expect(tiles.nth(0).locator('img')).toBeVisible();
    await expect(tiles.nth(1).locator('img')).toBeVisible();
    await tiles.nth(0).getByRole('button', { name: 'Play YouTube video, cover' }).click();
    await expect(tiles.nth(0).locator('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1');
    await expect(tiles.nth(1).locator('iframe')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Message' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add to Project' })).toHaveCount(0);
    await expect(page.getByText('Shoot start')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Setup steps' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /COPY\s*THAT/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search crew, projects, resources' })).toBeDisabled();
    await expect(page.getByText('Review takes ~24h — you\'ll show as “Pending review” until approved.')).toBeVisible();

    await page.getByRole('button', { name: 'Edit profile' }).click();
    await page.getByRole('textbox', { name: 'Bio' }).fill('Lights, camera, and a revised bio.');
    const basicSaved = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/me/basic') && response.ok());
    const setupSaved = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/me/setup') && response.ok());
    await page.getByRole('button', { name: 'Save profile' }).click();
    expect((await basicSaved).status()).toBe(200);
    expect((await setupSaved).status()).toBe(200);
    await expect(page.getByText('Lights, camera, and a revised bio.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit Nike — Up In The Air' }).click();
    await page.getByRole('textbox', { name: 'Project title for Nike — Up In The Air' }).fill('Nike — Revised');
    const creditSaved = page.waitForResponse((response) =>
        response.request().method() === 'PATCH' && response.url().includes('/api/me/projects/') && response.ok());
    await page.getByRole('button', { name: 'Save Nike — Up In The Air' }).click();
    expect((await creditSaved).status()).toBe(200);
    await expect(page.getByText('Nike — Revised', { exact: true })).toBeVisible();
    await expect(page.getByText('Worked on Nike — Revised.')).toBeVisible();

    const removed = page.waitForResponse((response) =>
        response.request().method() === 'DELETE' && response.url().includes('/api/me/media/') && response.ok());
    await page.getByRole('button', { name: /Delete YouTube video/ }).first().click();
    expect((await removed).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Submit profile' })).toBeDisabled();
    await addLink(page, videoUrls[0]);
    await expect(page.getByRole('button', { name: 'Submit profile' })).toBeEnabled();

    await page.getByRole('button', { name: 'Go back' }).click();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue — review' }).click();
    await expectReview(page);

    await page.goto('./');
    await expectReview(page);

    const submitted = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/me/review') && response.ok());
    await page.getByRole('button', { name: 'Submit profile' }).click();
    expect((await submitted).status()).toBe(200);
    await expectWait(page);

    await page.goto('./');
    await expectWait(page);
    await page.reload();
    await expectWait(page);
});

async function expectWait(page: Page): Promise<void> {
    await expect(page.getByText('Your profile is in review. An administrator will approve it before you go live.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Setup steps' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /COPY\s*THAT/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search crew, projects, resources' })).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'Director' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Sugarhi' })).toBeVisible();
    const avatar = page.locator('.crew-avatar img');
    await expect(avatar).toHaveAttribute('src', /^\/content\//);
    await expect(avatar).toHaveJSProperty('naturalWidth', 400);
    await expect(page.getByRole('button', { name: 'Edit profile' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Update Calendar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Submit profile' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Go back' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add credit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Upload' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add project type' })).toHaveCount(0);
    await expect(page.locator('.project-type-tag').filter({ hasText: 'Commercial' })).toBeVisible();
}

async function expectReview(page: Page): Promise<void> {
    await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit profile' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Your availability' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Calendar' })).toBeVisible();
    await expect(page.locator('.crew-stat').filter({ hasText: 'Projects completed' }).locator('strong')).toHaveText('18');
    await expect(page.locator('.crew-stat').filter({ hasText: 'Average Response' }).locator('strong')).toHaveText('< 12h');
    await expect(page.locator('.crew-stat').filter({ hasText: 'Repeat Clients' }).locator('strong')).toHaveText('100%');
    await expect(page.locator('.crew-stat').filter({ hasText: 'Years Active' }).locator('strong')).toHaveText('3');
    await expect(page.getByRole('list', { name: 'Setup steps' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Search crew, projects, resources' })).toBeDisabled();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
}

async function openMedia(page: Page): Promise<void> {
    await page.goto('sign-in');
    await page.getByLabel('Email').fill(devUser.email);
    await page.getByLabel('Password').fill(devUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('radio', { name: /I'm Crew/ }).click();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();

    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'portrait.png',
        mimeType: 'image/png',
        buffer: solidPng(400, 400),
    });
    await expect(page.getByRole('img', { name: 'Profile photo' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Phone' }).fill('+1 213 555 0100');
    await page.getByRole('textbox', { name: 'Bio' }).fill('Producer and director based in Mexico City.');
    const uploaded = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/me/photo') && response.ok());
    await page.getByRole('button', { name: 'Continue — setup' }).click();
    await uploaded;

    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
    await page.locator('.profile-choice').getByText('Shooting', { exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Position' })).toBeEnabled();
    await chooseOption(page, 'Position', 'Director', 'Director');
    await page.getByLabel('Day rate').fill('2000');
    await chooseOption(page, 'Currency', 'USD');
    await page.locator('.union-choice').getByText('Union', { exact: true }).click();
    await chooseOption(page, 'Working as a local in', 'Los Angeles, US', 'Los Angeles');
    await chooseOption(page, 'Working as a local in', 'Mexico City, MX', 'Mexico');
    await page.getByRole('button', { name: 'Set Mexico City as your home city' }).click();
    await page.getByRole('button', { name: 'Continue — experience' }).click();

    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await page.getByLabel('Project title').fill('Nike — Up In The Air');
    await chooseOption(page, 'Position', 'Director', 'Director');
    await page.getByLabel('Lead producer', { exact: true }).fill('Sarah Kim');
    await page.getByLabel('Lead producer email').fill('sarah.kim@example.com');
    await page.getByLabel('Date').fill('2024-03-12');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Nike — Up In The Air')).toBeVisible();
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PUT' && response.url().includes('/project-types') && response.ok()),
        chooseOption(page, 'Project types', 'Commercial', 'Commercial'),
    ]);
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PUT' && response.url().includes('/project-types') && response.ok()),
        chooseOption(page, 'Project types', 'Music Video', 'Music'),
    ]);
    await fillTrackRecord(page);
    await page.getByRole('button', { name: 'Continue — upload media' }).click();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
}

async function addLink(page: Page, url: string): Promise<void> {
    await page.getByRole('button', { name: 'YouTube / Vimeo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a YouTube or Vimeo video' });
    await dialog.getByLabel('Vimeo or YouTube link').fill(url);
    await dialog.locator('input[type="file"]').setInputFiles(thumbnail);
    await expect(dialog.getByRole('img', { name: 'Selected thumbnail' })).toBeVisible();
    const created = page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/me/media') && response.ok());
    const stored = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/me/media/') && response.url().includes('/thumbnail') && response.ok());
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await created;
    await stored;
    await expect(dialog).toBeHidden();
}

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
