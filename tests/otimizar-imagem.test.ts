import { afterEach, describe, expect, it, vi } from "vitest";
import { LARGURA_MAXIMA, otimizarImagem, resumoOtimizacao } from "@/lib/nexa/otimizar-imagem";

const arquivo = (nome: string, tipo: string, tamanho = 200) =>
  new File([new Uint8Array(tamanho)], nome, { type: tipo });

afterEach(() => vi.unstubAllGlobals());

describe("resumoOtimizacao", () => {
  it("informa a economia apenas quando o arquivo realmente diminuiu", () => {
    expect(resumoOtimizacao(4_000_000, 400_000)).toEqual({
      original: 4_000_000,
      final: 400_000,
      economia: 3_600_000,
      percentual: 90,
    });
    expect(resumoOtimizacao(100, 100)).toBeNull();
    expect(resumoOtimizacao(100, 120)).toBeNull();
  });
});

describe("otimizarImagem", () => {
  it("mantém vídeos e GIFs intactos", async () => {
    const video = arquivo("video.mp4", "video/mp4");
    const gif = arquivo("animacao.gif", "image/gif");
    await expect(otimizarImagem(video)).resolves.toBe(video);
    await expect(otimizarImagem(gif)).resolves.toBe(gif);
  });

  it("redimensiona foto grande, converte para WebP e libera a URL temporária", async () => {
    const desenhar = vi.fn();
    const revogar = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      toDataURL: vi.fn(() => "data:image/webp;base64,ok"),
      getContext: vi.fn(() => ({ drawImage: desenhar })),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array(80)])),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:foto"), revokeObjectURL: revogar });
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = LARGURA_MAXIMA * 2;
        naturalHeight = 2400;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_valor: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );

    const resultado = await otimizarImagem(arquivo("fachada.jpg", "image/jpeg", 500));

    expect(resultado.name).toBe("fachada.webp");
    expect(resultado.type).toBe("image/webp");
    expect(resultado.size).toBe(80);
    expect(canvas.width).toBe(LARGURA_MAXIMA);
    expect(canvas.height).toBe(1200);
    expect(desenhar).toHaveBeenCalledWith(expect.anything(), 0, 0, LARGURA_MAXIMA, 1200);
    expect(revogar).toHaveBeenCalledWith("blob:foto");
  });

  it("preserva o arquivo quando a conversão não reduz o peso", async () => {
    const original = arquivo("prato.png", "image/png", 100);
    const canvas = {
      width: 0,
      height: 0,
      toDataURL: vi.fn(() => "data:image/webp;base64,ok"),
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array(200)])),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:prato"), revokeObjectURL: vi.fn() });
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 800;
        naturalHeight = 600;
        onload: (() => void) | null = null;
        set src(_valor: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );

    await expect(otimizarImagem(original)).resolves.toBe(original);
  });
});
