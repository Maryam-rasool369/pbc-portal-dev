interface BadgeProps {
  text: string;
  variant?: 'default' | 'gold' | 'gray';
}

export default function Badge({ text, variant = 'default' }: BadgeProps) {
  const baseStyles = "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium m-0.5";
  
  const variantStyles = {
    default: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    gold: "bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-300",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]}`}>
      {text}
    </span>
  );
}