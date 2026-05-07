"use client"
import { motion, useInView } from "framer-motion"
import Image from "next/image"
import { useRef } from "react"
import Marquee from "@/components/ui/marquee"
import { cn } from "@/lib/utils"

const logos = [
    { img: "/logos/logo-ispum-1.avif" },
    { img: "/logos/logo-ispum-2.avif" },
    { img: "/logos/logo-ispum-3.avif" },
    { img: "/logos/logo-ispum-4.avif" },
    { img: "/logos/logo-ispum-5.avif" },
    { img: "/logos/logo-ispum-6.avif" }
]

const row = logos.slice(0, logos.length / 2)

const LogoCard = ({ img }: { img: string }) => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-50px" })

    return (
        <motion.figure
            ref={ref}
            className={cn(
                "relative flex w-64 cursor-pointer items-center justify-center overflow-hidden rounded-xl p-4"
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
                isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
            }
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="flex flex-row items-center justify-center gap-6">
                <Image
                    width={180}
                    height={180}
                    className="rounded-full"
                    alt="logo"
                    src={img}
                />
            </div>
        </motion.figure>
    )
}

const Trusted = () => {
    return (
        <div className="container mx-auto md:max-w-[1200px]">
            <div className="mb-8 text-center">
                <h2 className="font-semibold text-2xl">Trusted by</h2>
            </div>
            <div className="relative flex w-full flex-col items-center justify-center overflow-hidden ">
                <Marquee className="[--duration:20s]">
                    {row.map((logo, i) => (
                        <LogoCard key={i} img={logo.img} />
                    ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background to-transparent" />
            </div>
        </div>
    )
}

export default Trusted
