import Image from "next/image";
import Link from "next/link";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface RelatedProductProps {
  product: {
    id: number;
    name: string;
    price?: number;
    description: string;
    primaryImage: string;
    variants?: {
      id: number;
      price: number;
      isDefault: boolean;
    }[];
  };
}

export default function RelatedProduct({ product }: RelatedProductProps) {
  const defaultVariant =
    product.variants?.find((variant) => variant.isDefault)
    || product.variants?.[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Related Product
        </h3>
        <div className="flex gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <Image
              src={product.primaryImage}
              alt={product.name}
              layout="fill"
              objectFit="cover"
              className="rounded-md"
            />
          </div>
          <div className="flex-1">
            <Link href={`/Product/${product.id}`}>
              <h4 className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium mb-1">
                {product.name}
              </h4>
            </Link>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
              {defaultVariant
                ? <CurrencyAmount amount={defaultVariant.price} />
                : "View details for pricing"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
