import { fetchApi } from "@/lib/utils";
import ProductContent from "./ProductContent";
import { getImageUrl } from "@/lib/imageUrl";



export async function generateMetadata({ params }) {
    const { slug } = params;
    let title = "Product Details | DfixKart";
    let description =
        "Shop premium quality products at DfixKart. Fast delivery, secure payments, and 100% genuine products.";
    let image = null;

    try {
        // Fetch product details from API
        const response = await fetchApi(`/public/products/${slug}`);
        const product = response.data.product;

        if (product) {
            title = product.metaTitle || `${product.name} | DfixKart`;
            description =
                product.metaDescription || product.description || description;

            // Get the first image from product images
            if (product.images && product.images.length > 0) {
                image = getImageUrl(product.images[0].url);
            }
        }
    } catch (error) {
        console.error("Error fetching product metadata:", error);
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: image ? [image] : [],
            type: "website",
        },
    };
}

export default function ProductDetailPage({ params }) {
    return <ProductContent slug={params.slug} />;
}
