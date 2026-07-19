import { Metadata, ResolvingMetadata } from "next";
import ProductDetailsClient from "./ProductClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  try {
    // Fetch product details from Firestore REST API for fast server-side execution
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${id}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!res.ok) throw new Error("Product not found");

    const data = await res.json();
    const title = data.fields?.Title?.stringValue || "Creator Resource";
    const description = data.fields?.Description?.stringValue || "High-quality premium creator resource.";
    const imageUrl = data.fields?.ImageURL?.stringValue || "";

    return {
      title: `${title} | Store`,
      description: description,
      openGraph: {
        title: title,
        description: description,
        images: imageUrl ? [imageUrl] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: "Product Not Found",
      description: "This product is unavailable or does not exist.",
    };
  }
}

export default async function ProductPage({ params }: PageProps) {
  return <ProductDetailsClient params={params} />;
}
