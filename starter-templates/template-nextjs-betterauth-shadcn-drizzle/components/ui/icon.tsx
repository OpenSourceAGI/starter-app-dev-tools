import { icons } from "lucide-react"

export const Icon = ({
    name,
    color,
    size,
    className
}: {
    name: keyof typeof icons
    color: string
    size: number
    className?: string
}) => {
    const LucideIcon = icons[name as keyof typeof icons]

    // Handle case where icon doesn't exist
    if (!LucideIcon) {
        console.warn(`Icon "${name}" not found in lucide-react`)
        return (
            <div
                className={className}
                style={{ width: size, height: size, backgroundColor: color }}
            />
        )
    }

    return <LucideIcon color={color} size={size} className={className} />
}
