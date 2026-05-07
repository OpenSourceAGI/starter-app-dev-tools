import { Providers } from "./providers"
import type { ReactNode } from "react"
import "@/styles/globals.css"

export default function RootLayout({
    children
}: Readonly<{
    children: ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    async
                    src="/seline.js"
                    data-token="24cc7b65ecf3469"
                />
            </head>
            <body className="flex min-h-svh flex-col antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
