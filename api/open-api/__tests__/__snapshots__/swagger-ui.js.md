# Snapshot report for `api/open-api/__tests__/swagger-ui.js`

The actual snapshot is saved in `swagger-ui.js.snap`.

Generated by [AVA](https://avajs.dev).

## computeHtmlPage

> Snapshot 1

    `<!DOCTYPE html>␊
    <html lang="en">␊
    <head>␊
      <meta charset="utf-8" />␊
      <meta name="viewport" content="width=device-width, initial-scale=1" />␊
      <title>Test Page</title>␊
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@^5.18.2/swagger-ui.css" />␊
    </head>␊
    <body>␊
    <div id="swagger-ui"></div>␊
    <script src="https://unpkg.com/swagger-ui-dist@^5.18.2/swagger-ui-bundle.js" crossorigin></script>␊
    <script>␊
      window.onload = () => {␊
        window.ui = SwaggerUIBundle({␊
          url: 'https://example.com/open-api.json',␊
          dom_id: '#swagger-ui',␊
        });␊
      };␊
    </script>␊
    </body>␊
    </html>`
