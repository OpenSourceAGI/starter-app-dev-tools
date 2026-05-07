interface PageHeaderProps {
    title: string
    description?: string
    className?: string
}

export function PageHeader({ title, description, className = "" }: PageHeaderProps) {
    return (
        <div className={`mb-8 ${className}`}>
            <h1 className="font-bold text-2xl tracking-tight">{title}</h1>
            {description && (
                <p className="text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    )
} 