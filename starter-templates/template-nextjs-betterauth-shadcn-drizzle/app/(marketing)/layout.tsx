import { Navbar } from "@/components/layout/navbar"
import { FooterSection } from "@/components/layout/sections/footer"
export default function MarketingLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Navbar />
            {children}
            <FooterSection />
        </>
    )
}
