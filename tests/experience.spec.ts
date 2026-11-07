import { expect, test, type Page, type Response } from '@playwright/test';
import { devUser, prepareDevUser } from './reset.ts';

test.beforeEach(async () => {
    await prepareDevUser();
});

test('saves credits and project types on the experience page', async ({ page }) => {
    await openExperience(page);

    await expect(page.getByText('STEP 3 OF 6')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByText('Credits live a resume — project, role and lead producer. Producers may be contacted as references.')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Experience & project types' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByText('What kinds of projects will you work on?')).toBeVisible();
    await expect(page.getByText('Pick all that apply. Clients filter crew by project type.')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Project types' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add project type' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Remove Visual FX' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Enter a project title.')).toBeVisible();
    await expect(page.getByText('Choose a position.')).toBeVisible();
    await expect(page.getByText('Enter the lead producer.')).toBeVisible();
    await expect(page.getByText('Enter the lead producer email.')).toBeVisible();
    await expect(page.getByText('Enter a date.')).toBeVisible();

    await addCredit(page, 'Nike — Up In The Air', 'Director', 'Director', 'Sarah Kim', 'sarah.kim@example.com');
    await expect(page.getByText('Nike — Up In The Air')).toBeVisible();
    await expect(page.getByText('Sarah Kim')).toBeVisible();
    await expect(page.getByText('sarah.kim@example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Edit Nike — Up In The Air' }).click();
    await page.getByLabel('Project title for Nike — Up In The Air').fill('Nike — Air');
    await chooseOption(page, 'Position for Nike — Up In The Air', 'Director of Photography', 'Photography');
    await page.getByLabel('Lead producer for Nike — Up In The Air', { exact: true }).fill('Jamie Chen');
    await page.getByLabel('Lead producer email for Nike — Up In The Air').fill('jamie.chen@example.com');
    await page.getByRole('button', { name: 'Save Nike — Up In The Air' }).click();
    await expect(page.getByText('Nike — Air')).toBeVisible();
    await expect(page.getByText('Director of Photography')).toBeVisible();
    await expect(page.getByText('Jamie Chen')).toBeVisible();
    await expect(page.getByText('jamie.chen@example.com')).toBeVisible();
    await expect(page.getByText('Nike — Up In The Air')).toHaveCount(0);
    await expect(page.getByText('Sarah Kim')).toHaveCount(0);

    await page.getByRole('button', { name: 'Remove Nike — Air' }).click();
    await expect(page.getByText('Nike — Air')).toHaveCount(0);

    await addCredit(page, 'Adidas — Origami Forever', 'Director', 'Director', 'Todd Martinez', 'todd.martinez@example.com');
    await expect(page.getByText('Adidas — Origami Forever')).toBeVisible();
    await expect(page.getByText('Todd Martinez')).toBeVisible();

    await chooseType(page, 'Commercial');
    await chooseType(page, 'Visual FX');
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Visual FX' })).toBeVisible();

    await addCredit(page, 'Spotify — Wrapped', 'Editor', 'Editor', 'Priya Shah', 'priya.shah@example.com', 2);
    await expect(page.getByText('Spotify — Wrapped')).toBeVisible();
    await expect(page.getByText('Priya Shah')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByText('Adidas — Origami Forever')).toBeVisible();
    await expect(page.getByText('Spotify — Wrapped')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Visual FX' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Podcast' })).toHaveCount(0);

    await removeType(page, 'Visual FX', 2);
    await expect(page.getByRole('button', { name: 'Remove Visual FX' })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Commercial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Visual FX' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Continue — upload media' }).click();
    await expect(page.getByText('Enter the number of projects you have completed.')).toBeVisible();
    await expect(page.getByText('Enter how many years you have been in the business.')).toBeVisible();
    await expect(page.getByText('Enter your average response time.')).toBeVisible();
    await fillTrackRecord(page);
    await page.getByRole('button', { name: 'Continue — upload media' }).click();
    await expect(page.getByRole('heading', { name: 'Upload your media' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add a video' })).toBeVisible();
});

async function openExperience(page: Page): Promise<void> {
    await page.goto('sign-in');
    await page.getByLabel('Email').fill(devUser.email);
    await page.getByLabel('Password').fill(devUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('radio', { name: /I'm Crew/ }).click();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();

    await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Phone' }).fill('+1 213 555 0100');
    await page.getByLabel('Title').fill('Commercial director');
    await page.getByLabel('Bio').fill('Producer and director based in Mexico City.');
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
}

async function addCredit(
    page: Page,
    title: string,
    position: string,
    positionSearch: string,
    producer: string,
    email: string,
    typeSaves = 0,
): Promise<void> {
    await page.getByLabel('Project title').fill(title);
    await chooseOption(page, 'Position', position, positionSearch);
    await page.getByLabel('Lead producer', { exact: true }).fill(producer);
    await page.getByLabel('Lead producer email').fill(email);
    await page.getByLabel('Date').fill('2024-03-12');
    const saves = typeSaves > 0 ? waitForTypeSaves(page, typeSaves) : null;
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await saves;
}

async function chooseType(page: Page, name: string, saves = 1): Promise<void> {
    const pending = waitForTypeSaves(page, saves);
    await chooseOption(page, 'Project types', name, name);
    await pending;
}

async function removeType(page: Page, name: string, saves = 1): Promise<void> {
    const pending = waitForTypeSaves(page, saves);
    await page.getByRole('button', { name: `Remove ${name}` }).click();
    await pending;
}

function waitForTypeSaves(page: Page, count: number): Promise<Response[]> {
    return Promise.all(Array.from({ length: count }, () => page.waitForResponse(isTypeSave)));
}

async function fillTrackRecord(page: Page): Promise<void> {
    await page.getByLabel('Projects completed').fill('18');
    await page.getByLabel('Years in the business').fill('3');
    await chooseOption(page, 'Response time', '< 12 hours');
}

function isTypeSave(response: Response): boolean {
    return response.request().method() === 'PUT'
        && response.url().includes('/project-types')
        && response.ok();
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
