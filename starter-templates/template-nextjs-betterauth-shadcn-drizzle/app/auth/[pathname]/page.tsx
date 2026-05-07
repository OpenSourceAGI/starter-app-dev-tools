import { AuthCard, AuthLoading } from "@daveyplate/better-auth-ui"
import { authViewPaths } from "@daveyplate/better-auth-ui/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WelcomeToast } from "@/components/layout/auth-loading-toast"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Authentication"
}

export function generateStaticParams() {
    return Object.values(authViewPaths).map((pathname) => ({ pathname }))
}

export default async function AuthPage({
    params
}: {
    params: Promise<{ pathname: string }>
}) {
    const { pathname } = await params

   

    return (
        <main className="container mx-auto flex grow flex-col items-center justify-center gap-4 self-center bg-background py-18 sm:py-22">
            <Link href="/" className="absolute top-6 left-8">
                <Button
                    variant="outline"
                    className="hover:bg-secondary hover:text-secondary-foreground"
                    size="sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </Link>

            <AuthLoading>
                <WelcomeToast />
            </AuthLoading>

            <AuthCard
                pathname={pathname}
            />

            {["sign-up"].includes(pathname) && (
                <div className="text-center text-muted-foreground text-sm">
                    <p>
                        By continuing, you agree to our{" "}
                        <Link
                            href="/terms"
                            className="underline hover:text-foreground"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="underline hover:text-foreground"
                        >
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            )}
        </main>
    )
}
