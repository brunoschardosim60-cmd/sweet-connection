import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MiniSite } from "@/components/minisite/MiniSite";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";

describe("interações externas da demonstração", () => {
  const site = siteDoModelo("restaurante-moderno");

  it("remove destinos externos da demonstração", () => {
    const html = renderToStaticMarkup(
      createElement(MiniSite, { site, interacoesExternas: false, botaoFlutuante: false }),
    );

    expect(html).not.toContain('href="https://wa.me/');
    expect(html).not.toContain('href="https://www.google.com/maps/');
    expect(html).not.toContain('target="_blank"');
    expect(html).toContain('aria-disabled="true"');
  });

  it("mantém os destinos externos no mini-site real", () => {
    const html = renderToStaticMarkup(createElement(MiniSite, { site, botaoFlutuante: false }));

    expect(html).toContain('href="https://wa.me/');
    expect(html).toContain('href="https://www.google.com/maps/');
    expect(html).toContain('target="_blank"');
  });
});
