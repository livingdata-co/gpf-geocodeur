export function computeHtmlPage({pageTitle, openApiDefinitionUrl}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@^5.18.2/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@^5.18.2/swagger-ui-bundle.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '${openApiDefinitionUrl}',
      dom_id: '#swagger-ui',
    });
  };
</script>
</body>
</html>`
}
