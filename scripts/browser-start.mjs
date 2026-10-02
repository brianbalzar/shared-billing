// Clear the chosen actors while preserving the landing-page recommendation.
export async function clearActors(page) {
  await page.waitForFunction(() => !document.querySelector('[role="combobox"]')?.disabled);
  const remove = page.getByRole('button', { name: /^Remove / });
  while (await remove.count()) await remove.first().click();
}
export async function loadExample(page) {
  await clearActors(page);
  for (const name of ['Tom Hanks', 'Audrey Hepburn']) {
    const search = page.getByRole('combobox');
    await search.fill(name);
    await page.getByRole('option').filter({ hasText: name }).first().waitFor();
    await search.press('Enter');
  }
}
