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

const PROJECT_OFFSETS: Record<string, number> = {
  chromium: 14,
  firefox: 28,
  webkit: 42,
  'mobile-chrome': 56,
  'mobile-safari': 70,
};

const getProjectOffset = (projectName: string) => PROJECT_OFFSETS[projectName] ?? 14;

const waitForAvailability = (page: Page, startDate?: string, endDate?: string) => {
  return page.waitForResponse((response) => {
    if (!response.url().includes('/api/DeskBooking/availability')) return false;
    if (!startDate || !endDate) return response.ok();
    const url = new URL(response.url());
    return response.ok()
      && url.searchParams.get('startDate') === startDate
      && url.searchParams.get('endDate') === endDate;
  });
};

const setFilterDates = async (
  page: Page,
  startDate: string,
  endDate: string,
  useForce: boolean,
) => {
  const responsePromise = useForce ? null : waitForAvailability(page, startDate, endDate);
  await page.evaluate(({ start, end }) => {
    const fromInput = document.querySelector<HTMLInputElement>('#filter-from');
    const toInput = document.querySelector<HTMLInputElement>('#filter-to');
    if (fromInput) {
      fromInput.value = start;
      fromInput.dispatchEvent(new Event('input', { bubbles: true }));
      fromInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (toInput) {
      toInput.value = end;
      toInput.dispatchEvent(new Event('input', { bubbles: true }));
      toInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { start: startDate, end: endDate });
  if (responsePromise) {
    await responsePromise;
  } else {
    await page.waitForTimeout(200);
  }
};

const pickReservableCard = async (page: Page): Promise<{ card: Locator; testId: string }> => {
  const card = page.locator('[data-testid^="desk-card-"]').filter({
    has: page.getByRole('button', { name: 'Reserve desk' }),
  }).first();
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
  const testId = await card.getAttribute('data-testid');
  if (!testId) {
    throw new Error('Expected desk card test id.');
  }
  return { card, testId };
};

const selectDeskCard = async (page: Page, testId: string, useForce: boolean) => {
  const card = page.getByTestId(testId);
  if (useForce) {
    await card.click({ force: true });
    return;
  }
  await card.click();
};

const clickCardButtonByText = async (
  page: Page,
  testId: string,
  label: string,
  useForce: boolean,
) => {
  if (!useForce) {
    await page.getByTestId(testId).getByRole('button', { name: label }).click();
    return;
  }

  await page.getByTestId(testId).getByRole('button', { name: label }).waitFor({ state: 'visible' });
  await page.evaluate(({ id, text }) => {
    const card = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    const button = Array.from(card?.querySelectorAll('button') ?? []).find(
      (el) => el.textContent?.includes(text),
    );
    (button as HTMLButtonElement | undefined)?.click();
  }, { id: testId, text: label });
};

const clickButtonByText = async (page: Page, label: string, useForce: boolean) => {
  if (!useForce) {
    await page.getByRole('button', { name: label }).click();
    return;
  }

  await page.getByRole('button', { name: label }).waitFor({ state: 'visible' });
  await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (el) => el.textContent?.includes(text),
    );
    (button as HTMLButtonElement | undefined)?.click();
  }, label);
};

const acceptNextDialog = (page: Page, message?: string) => {
  page.once('dialog', async (dialog) => {
    if (message) {
      expect(dialog.message()).toContain(message);
    }
    await dialog.accept();
  });
};

test('reserve and cancel a desk', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Mobile runs a lighter smoke flow.');
  const baseOffset = getProjectOffset(testInfo.project.name);
  const startDate = toDateInputValue(addDays(baseOffset));
  const endDate = toDateInputValue(addDays(baseOffset + 1));
  const needsForce = testInfo.project.name.startsWith('mobile');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();

  await setFilterDates(page, startDate, endDate, needsForce);

  const { testId: cardTestId } = await pickReservableCard(page);

  const reserveRefresh = needsForce ? null : waitForAvailability(page, startDate, endDate);
  acceptNextDialog(page, 'Reservation successful');
  await clickCardButtonByText(page, cardTestId, 'Reserve desk', needsForce);
  await clickButtonByText(page, 'Confirm reservation', needsForce);
  if (reserveRefresh) await reserveRefresh;

  const updatedCard = page.getByTestId(cardTestId);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  const cancelRefresh = needsForce ? null : waitForAvailability(page, startDate, endDate);
  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-whole').click({ force: needsForce });
  if (cancelRefresh) await cancelRefresh;
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
});

test('quick reserve and filters', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Mobile runs a lighter smoke flow.');
  const baseOffset = getProjectOffset(testInfo.project.name) + 7;
  const date = toDateInputValue(addDays(baseOffset));
  const needsForce = testInfo.project.name.startsWith('mobile');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();
  await setFilterDates(page, date, date, needsForce);

  const { testId: cardTestId } = await pickReservableCard(page);
  await selectDeskCard(page, cardTestId, needsForce);

  const quickReserveRefresh = needsForce ? null : waitForAvailability(page, date, date);
  acceptNextDialog(page, 'Reservation successful');
  await page.getByRole('button', { name: /Quick reserve/ }).click();
  if (quickReserveRefresh) await quickReserveRefresh;

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

  const quickCancelRefresh = needsForce ? null : waitForAvailability(page, date, date);
  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-whole').click({ force: needsForce });
  if (quickCancelRefresh) await quickCancelRefresh;
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
});

test('cancel day frees a single date', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Mobile runs a lighter smoke flow.');
  const baseOffset = getProjectOffset(testInfo.project.name) + 14;
  const startDate = toDateInputValue(addDays(baseOffset));
  const endDate = toDateInputValue(addDays(baseOffset + 1));
  const needsForce = testInfo.project.name.startsWith('mobile');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();
  await setFilterDates(page, startDate, endDate, needsForce);

  const { testId: cardTestId } = await pickReservableCard(page);

  const reserveRefresh = needsForce ? null : waitForAvailability(page, startDate, endDate);
  acceptNextDialog(page, 'Reservation successful');
  await clickCardButtonByText(page, cardTestId, 'Reserve desk', needsForce);
  await page.locator('#reserve-start').fill(startDate);
  await page.locator('#reserve-end').fill(endDate);
  await page.keyboard.press('Escape');
  await clickButtonByText(page, 'Confirm reservation', needsForce);
  if (reserveRefresh) await reserveRefresh;

  const updatedCard = page.getByTestId(cardTestId);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  const cancelDayRefresh = needsForce ? null : waitForAvailability(page, startDate, endDate);
  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-day').click({ force: needsForce });
  if (cancelDayRefresh) await cancelDayRefresh;

  await setFilterDates(page, startDate, startDate, needsForce);
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();

  await setFilterDates(page, endDate, endDate, needsForce);
  await expect(updatedCard.getByText('My desk')).toBeVisible();

  const cancelWholeRefresh = needsForce ? null : waitForAvailability(page, endDate, endDate);
  acceptNextDialog(page);
  await updatedCard.getByTestId('cancel-whole').click({ force: needsForce });
  if (cancelWholeRefresh) await cancelWholeRefresh;
  await expect(updatedCard.getByRole('button', { name: 'Reserve desk' })).toBeVisible();
});

test('mobile desks load', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only flow.');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your desk' })).toBeVisible();
  await expect(page.locator('[data-testid^="desk-card-"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Only open' }).click();
  await page.getByRole('button', { name: 'Only open' }).click();
  await page.getByRole('button', { name: 'High contrast' }).click();
  await expect(page.locator('.high-contrast')).toBeVisible();
});

test('profile page loads', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Active reservations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});
