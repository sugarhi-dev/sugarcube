import { expect, test, type Page } from '@playwright/test';
import { devUser, prepareDevUser } from './reset.ts';

const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const vimeoUrl = 'https://vimeo.com/76979871';
const thumbnail = {
    name: 'thumb.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAASACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiaKKK7T+lgooooAKKKKACiiigD//Z',
        'base64',
    ),
};

test.beforeEach(async () => {
    await prepareDevUser();
});

test('shows YouTube and Vimeo thumbnails and reorders them', async ({ page }) => {
    test.setTimeout(90_000);
    await openMedia(page);

    await page.getByRole('button', { name: 'Upload' }).click();
    const upload = page.getByRole('dialog', { name: 'Upload a video' });
    await expect(upload.getByText("Uploading a video file isn't available yet.")).toBeVisible();
    await upload.getByRole('button', { name: 'Close' }).click();
    await expect(upload).toBeHidden();

    await page.getByRole('button', { name: 'YouTube / Vimeo' }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add a YouTube or Vimeo video' });
    await addDialog.getByLabel('Vimeo or YouTube link').fill('https://example.com/not-a-video');
    await addDialog.locator('input[type="file"]').setInputFiles(thumbnail);
    await expect(addDialog.getByRole('img', { name: 'Selected thumbnail' })).toBeVisible();
    await addDialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(addDialog.getByRole('alert')).toHaveText('Paste a YouTube or Vimeo link.');
    await addDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('0 of 5 — add 5 more')).toBeVisible();

    await addLink(page, youtubeUrl);
    const youtube = page.getByRole('listitem', { name: /YouTube video, cover/ });
    await expect(youtube.locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(youtube).toHaveCSS('width', /^33\d(\.\d+)?px$/);
    await expect(youtube.getByText('Cover')).toBeVisible();
    await expect(page.getByText('1 of 5 — add 4 more')).toBeVisible();

    await addLink(page, vimeoUrl);
    const vimeo = page.getByRole('listitem', { name: /Vimeo video, 2 of 2/ });
    await expect(vimeo.locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(page.getByText('2 of 5 — add 3 more')).toBeVisible();

    await dragCard(page, vimeo, youtube);
    const grid = page.locator('.media-grid');
    await expect(grid.getByRole('listitem').nth(0)).toHaveAttribute('aria-label', /Vimeo video, cover/);
    await expect(grid.getByRole('listitem').nth(1)).toHaveAttribute('aria-label', /YouTube video, 2 of 2/);

    await grid.getByRole('listitem', { name: /YouTube video, 2 of 2/ }).focus();
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PUT' && response.url().includes('/api/me/media/order') && response.ok()),
        page.keyboard.press('ArrowLeft'),
    ]);
    await expect(grid.getByRole('listitem').nth(0)).toHaveAttribute('aria-label', /YouTube video, cover/);
    await expect(grid.getByRole('listitem').nth(1)).toHaveAttribute('aria-label', /Vimeo video, 2 of 2/);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
    const reloaded = page.locator('.media-grid');
    await expect(reloaded.getByRole('listitem').nth(0)).toHaveAttribute('aria-label', /YouTube video, cover/);
    await expect(reloaded.getByRole('listitem').nth(0).locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(reloaded.getByRole('listitem').nth(1).locator('img')).toHaveAttribute('src', /^blob:/);

    const second = reloaded.getByRole('listitem').nth(1);
    await second.getByRole('button', { name: /^Edit / }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit video link' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Replacement link').fill('https://example.com/not-a-video');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Paste a YouTube or Vimeo link.');

    await dialog.getByLabel('Replacement link').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PATCH' && response.url().includes('/api/me/media/') && response.ok()),
        dialog.getByRole('button', { name: 'Save' }).click(),
    ]);
    await expect(second.locator('img')).toHaveAttribute('src', /^blob:/);

    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'DELETE' && response.url().includes('/api/me/media/') && response.ok()),
        second.getByRole('button', { name: /^Delete / }).click(),
    ]);
    await expect(reloaded.getByRole('listitem')).toHaveCount(1);

    await page.reload();
    await expect(page.locator('.media-grid').getByRole('listitem')).toHaveCount(1);
    await expect(page.locator('.media-grid').locator('img')).toHaveAttribute('src', /^blob:/);
});

async function openMedia(page: Page): Promise<void> {
    await page.goto('sign-in');
    await page.getByLabel('Email').fill(devUser.email);
    await page.getByLabel('Password').fill(devUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('radio', { name: /I'm Crew/ }).click();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();

    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Phone' }).fill('+1 213 555 0100');
    await page.getByRole('textbox', { name: 'Bio' }).fill('Producer and director based in Mexico City.');
    await page.getByRole('button', { name: 'Continue — setup' }).click();

    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
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
    await page.getByRole('button', { name: 'Continue — upload media' }).click();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add a video' })).toBeVisible();
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

async function dragCard(page: Page, source: ReturnType<Page['getByRole']>, target: ReturnType<Page['getByRole']>): Promise<void> {
    const sourceBox = await source.getByRole('button', { name: /^Move / }).boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) {
        throw new Error('Could not measure the media cards.');
    }

    const saved = page.waitForResponse((response) =>
        response.request().method() === 'PUT' && response.url().includes('/api/me/media/order') && response.ok());
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await saved;
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
