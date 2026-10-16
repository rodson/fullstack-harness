import { expect, test } from '@playwright/test'

test('TC-010 创建任务后出现在列表顶部，刷新后仍在', async ({ page }) => {
  const title = `e2e-${Date.now()}`
  await page.goto('/')
  await page.getByLabel('任务标题').fill(title)
  await page.getByRole('button', { name: '添加' }).click()

  await expect(page.getByRole('listitem').first()).toContainText(title)
  await page.reload()
  await expect(page.getByText(title)).toBeVisible()
})

test('视觉基线：页面头部', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main > header')).toHaveScreenshot('header.png')
})
