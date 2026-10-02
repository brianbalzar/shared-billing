// Existing fixture checks can still reach the manual example after random startup.
export async function clearActors(page) {
  await page.waitForFunction(() => document.querySelectorAll('.chosen').length === 2);
  const remove = page.getByRole('button', { name: /^Remove / });
  while (await remove.count()) await remove.first().click();
}
