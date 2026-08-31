export default function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
    return (
        <img
            src="/logo.png"
            alt="Jobyn"
            width={size}
            height={size}
            className={className}
            loading="eager"
            decoding="async"
        />
    )
}
