import { test, expect, type Locator, type Page } from '@playwright/test';

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const setFilterDates = async (page: Page, startDate: string, endDate: string) => {
  await page.getByLabel('Filter start date').fill(startDate);
  await page.getByLabel('Filter end date').fill(endDate);
};

const pickReservableCard = async (page: Page): Promise<{ card: Locator; testId: string }> => {
  const card = page.locator('[data-testid^="desk-card-"]').filter({
    has: page.getByRole('button', { name: 'Reserve desk' }),
  }).first();
  const testId = await card.getAttribute('data-testid');
  if (!testId) {
    throw new Error('Expected desk card test id.');
  }
  return { card, testId };
};

const acceptNextDialog = (page: Page, message?: string) => {
  page.once('dialog', async (dialog) => {
    if (message) {
      expect(dialog.message()).toContain(message);
    }
    await dialog.accept();
  });
};

test('reserve and cancel a desk', async ({ page }) => {
  const startDate = toDateInputValue(addDays(14));
  const endDate = toDateInputValue(addDays(15));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();

  await setFilterDates(page, startDate, endDate);

  const { card: reserveCard, testId: cardTestId } = await pickReservableCard(page);

  acceptNextDialog(page, 'Reservation successful');
  await reserveCard.getByRole('button', { name: 'Reserve desk' }).click();
  await page.getByRole('button', { name: 'Confirm reservation' }).click();

  const updatedCard = page.getByTestId(cardTestId);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-whole').click();
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
});

test('quick reserve and filters', async ({ page }) => {
  const date = toDateInputValue(addDays(21));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();
  await setFilterDates(page, date, date);

  const { card: reserveCard, testId: cardTestId } = await pickReservableCard(page);
  await reserveCard.click();

  acceptNextDialog(page, 'Reservation successful');
  await page.getByRole('button', { name: /Quick reserve/ }).click();

  const updatedCard = page.getByTestId(cardTestId);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  await page.getByRole('button', { name: 'Only open' }).click();
  await expect(page.getByTestId(cardTestId)).toHaveCount(0);
  await page.getByRole('button', { name: 'Only open' }).click();

  await page.getByRole('button', { name: 'Only mine' }).click();
  await expect(updatedCard.getByText('My desk')).toBeVisible();
  await page.getByRole('button', { name: 'Only mine' }).click();

  await page.getByRole('button', { name: 'High contrast' }).click();
  await expect(page.locator('.high-contrast')).toBeVisible();

  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-whole').click();
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
});

test('cancel day frees a single date', async ({ page }) => {
  const startDate = toDateInputValue(addDays(28));
  const endDate = toDateInputValue(addDays(29));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();
  await setFilterDates(page, startDate, endDate);

  const { card: reserveCard, testId: cardTestId } = await pickReservableCard(page);

  acceptNextDialog(page, 'Reservation successful');
  await reserveCard.getByRole('button', { name: 'Reserve desk' }).click();
  await page.locator('#reserve-start').fill(startDate);
  await page.locator('#reserve-end').fill(endDate);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Confirm reservation' }).click();

  const updatedCard = page.getByTestId(cardTestId);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-day').click();

  await setFilterDates(page, startDate, startDate);
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();

  await setFilterDates(page, endDate, endDate);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-whole').click();
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
});

test('profile page loads', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Active reservations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});
