import { NextResponse } from 'next/server'

const config = {
  spec: {
    url: '/api/openapi.json',
  },
  theme: 'solarized',
}

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi.json"
      data-configuration='${JSON.stringify(config)}'></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
