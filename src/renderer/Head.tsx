// https://vike.dev/Head

export const THEME_INIT_SCRIPT =
  "(function(){try{var raw=localStorage.getItem('app-theme');var t='system';if(raw){try{t=JSON.parse(raw);}catch(e){t=raw;}}var dark=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',dark);var meta=document.querySelector('meta[name=\"theme-color\"]');if(meta)meta.content=dark?'#1f2937':'#2563eb';}catch(e){}})();";

import * as m from "@/paraglide/messages";
import { getBaseUrl } from "@/lib/base-url";

export function Head() {
  const title = m.page_title();
  const description = m.seo_description();
  const baseUrl = getBaseUrl();

  return (
    <>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://rateuni.framework.ge; worker-src 'self' blob:; manifest-src 'self';"
      />
      <meta name="theme-color" content="#2563eb" />
      <meta name="color-scheme" content="light dark" />
      <meta name="description" content={description} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={title} />
      <meta property="og:title" content={title} />
      <meta
        property="og:description"
        content={description}
      />
      <meta property="og:url" content={`${baseUrl}/`} />
      <meta property="og:image" content={`${baseUrl}/og-image.png`} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:logo" content={`${baseUrl}/logo.png`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta
        name="twitter:description"
        content={description}
      />
      <meta name="twitter:image" content={`${baseUrl}/og-image.png`} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": title,
        "url": `${baseUrl}/`,
        "description": description,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Any",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      }) }} />

      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

      <style>
        {`html{background-color:#f3f4f6;color:#111827}html.dark{background-color:#111827;color:#f9fafb}body{background-color:inherit;color:inherit}`}
      </style>
    </>
  );
}
