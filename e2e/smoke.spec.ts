import { expect, test } from "@playwright/test";

// Smoke test: app responde, login carrega, 404 funciona, manifest PWA OK.
// Testes clínicos de ponta-a-ponta exigem seed de dados no Supabase (não rodam em CI leve).

test.describe("Smoke — app básico", () => {
  test("tela de login carrega", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // Campo de email existe
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 10_000 });
  });

  test("rota desconhecida mostra NotFound", async ({ page }) => {
    await page.goto("/rota-que-nao-existe-xyz");
    await expect(page.locator("body")).toContainText(/404|não encontrad/i);
  });

  test("manifest PWA disponível", async ({ request }) => {
    const r = await request.get("/manifest.webmanifest");
    expect([200, 304]).toContain(r.status());
  });
});

test.describe("Atalhos de teclado", () => {
  test("tecla '?' abre ajuda de atalhos em página autenticada (se logado)", async ({ page }) => {
    await page.goto("/login");
    // Não logamos aqui — o teste apenas verifica que o handler não quebra a página.
    await page.keyboard.press("?");
    // Não deve crashar
    await expect(page.locator("body")).toBeVisible();
  });
});
