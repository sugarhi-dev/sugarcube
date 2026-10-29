import { expect, test, type Page } from '@playwright/test';
import { devUser, prepareDevUser } from './reset.ts';

test.beforeEach(async () => {
    await prepareDevUser();
});

test('logs in and completes profile setup', async ({ page }) => {
    await page.goto('sign-in');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Email').fill(devUser.email);
    await page.getByLabel('Password').fill(devUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'How will you use CopyThat?' })).toBeVisible();
    await page.getByRole('radio', { name: /I'm Crew/ }).click();
    await page.getByRole('button', { name: 'Continue as Crew' }).click();

    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
    await page.locator('.profile-choice').getByText('Shooting', { exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Position' })).toBeEnabled();
    await chooseOption(page, 'Position', 'Director', 'Director');
    await page.getByLabel('Phone number').fill('+1 213 555 0100');
    await page.getByLabel('Day rate').fill('850');
    await chooseOption(page, 'Currency', 'USD');
    await page.locator('.union-choice').getByText('Non-Union', { exact: true }).click();
    await page.getByRole('switch', { name: 'Would consider flat fee offers' }).click();
    await chooseOption(page, 'Working as a local in', 'Los Angeles, US', 'Los Angeles');
    await page.getByRole('button', { name: 'Continue — experience' }).click();

    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await page.getByLabel('Project title').fill('Nike — Up In The Air');
    await chooseOption(page, 'Position', 'Director', 'Director');
    await page.getByLabel('Lead producer').fill('Sarah Kim');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Nike — Up In The Air')).toBeVisible();
    await expect(page.getByText('Lead producer: Sarah Kim')).toBeVisible();
    await page.getByRole('button', { name: 'Edit Nike — Up In The Air' }).click();
    await page.getByLabel('Lead producer for Nike — Up In The Air').fill('Jamie Chen');
    await page.getByRole('button', { name: 'Save Nike — Up In The Air' }).click();
    await expect(page.getByText('Lead producer: Jamie Chen')).toBeVisible();
    await expect(page.getByText('Lead producer: Sarah Kim')).toHaveCount(0);
    await page.getByRole('button', { name: 'Remove Nike — Up In The Air' }).click();
    await expect(page.getByText('Nike — Up In The Air')).toHaveCount(0);

    await page.getByLabel('Project title').fill('Adidas — Origami Forever');
    await chooseOption(page, 'Position', 'Director of Photography', 'Photography');
    await page.getByLabel('Lead producer').fill('Todd Martinez');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Adidas — Origami Forever')).toBeVisible();
    await expect(page.getByText('Director of Photography')).toBeVisible();
    const commercial = page.getByRole('button', { name: 'Commercial', exact: true });
    await Promise.all([
        page.waitForResponse((response) =>
            response.request().method() === 'PUT' && response.url().includes('/project-types') && response.ok()),
        commercial.click(),
    ]);
    await expect(commercial).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Experience & project types' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Commercial', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Continue — upload media' }).click();

    await expect(page.getByRole('heading', { name: `Hello, ${devUser.firstName} ${devUser.lastName}` })).toBeVisible();
    await expect(page.getByText(devUser.email)).toBeVisible();
});

async function chooseOption(page: Page, label: string, option: string, search?: string): Promise<void> {
    const combo = page.getByRole('combobox', { name: label });
    await combo.click();
    if (search) {
        await combo.fill(search);
    }
    const choice = page.locator('.ant-select-dropdown:visible .ant-select-item-option-content').getByText(option, { exact: true });
    await choice.click();
}
