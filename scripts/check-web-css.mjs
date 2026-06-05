const baseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
const routes = (
  process.env.WEB_CSS_ROUTES ||
  "/,/tender-analysis,/technical-plan,/business-bid,/knowledge-base,/risk-check,/duplicate-check,/export,/settings"
)
  .split(",")
  .filter(Boolean);

async function readText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { response, text };
}

for (const route of routes) {
  const url = new URL(route, baseUrl).toString();
  const { response, text: html } = await readText(url);

  if (!response.ok) {
    throw new Error(`${route} HTML 请求失败：${response.status}`);
  }

  const cssLinks = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((match) => match[1]);
  if (!cssLinks.length) {
    throw new Error(`${route} 未发现 CSS 链接`);
  }

  for (const href of cssLinks) {
    const cssUrl = new URL(href, baseUrl).toString();
    const { response: cssResponse, text: css } = await readText(cssUrl);
    const contentType = cssResponse.headers.get("content-type") || "";

    if (!cssResponse.ok) {
      throw new Error(`${route} CSS 请求失败：${href} ${cssResponse.status}`);
    }

    if (!contentType.includes("text/css")) {
      throw new Error(`${route} CSS Content-Type 异常：${href} ${contentType}`);
    }

    if (!css.includes(".page-grid") && !css.includes("--tw-")) {
      throw new Error(`${route} CSS 内容异常：${href}`);
    }
  }

  console.log(`[ok] ${route} CSS ${cssLinks.length} 个文件加载正常`);
}
