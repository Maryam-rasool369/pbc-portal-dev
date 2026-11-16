import Badge from "./Badge";

interface BadgeListProps {
  items: string[];
  variant?: 'default' | 'gold' | 'gray';
}

export default function BadgeList({ items, variant = 'default' }: BadgeListProps) {
  if (!items?.length) return <span className="text-gray-500 dark:text-gray-400">-</span>;

  return (
    <div className="flex flex-wrap -m-0.5">
      {items.map((item, index) => (
        <Badge key={index} text={item} variant={variant} />
      ))}
    </div>
  );
}
