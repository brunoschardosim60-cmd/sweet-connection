import { useEffect } from "react";
import type { Site } from "@/lib/nexa/types";

const carregarScript = (id: string, src: string) => {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.async = true;
  el.src = src;
  document.head.appendChild(el);
};

const executar = (id: string, codigo: string) => {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.textContent = codigo;
  document.head.appendChild(el);
};

const limpo = (valor?: string) => (valor ?? "").trim();

/**
 * Carrega Google Analytics, Meta Pixel e Google Tag Manager configurados pelo
 * dono do mini-site. Roda apenas no navegador e apenas na página publicada.
 */
export function Rastreadores({ site }: { site: Site }) {
  const ga = limpo(site.integracoes.googleAnalytics);
  const pixel = limpo(site.integracoes.metaPixel);
  const gtm = limpo(site.integracoes.googleTagManager);

  useEffect(() => {
    if (!ga) return;
    carregarScript("nexa-ga-src", `https://www.googletagmanager.com/gtag/js?id=${ga}`);
    executar(
      "nexa-ga-init",
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`,
    );
  }, [ga]);

  useEffect(() => {
    if (!gtm) return;
    executar(
      "nexa-gtm",
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
    );
  }, [gtm]);

  useEffect(() => {
    if (!pixel) return;
    executar(
      "nexa-meta-pixel",
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`,
    );
  }, [pixel]);

  return null;
}
