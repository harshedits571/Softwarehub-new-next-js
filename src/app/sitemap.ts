import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://softwarehubs.in';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Base static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/creator`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  ];

  try {
    // Fetch products from Firestore REST API
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?pageSize=100`, {
      next: { revalidate: 3600 } // Re-fetch every hour
    });
    
    if (res.ok) {
      const data = await res.json();
      const documents = data.documents || [];
      
      const productRoutes = documents.map((doc: any) => {
        // Extract the document ID from the full path: projects/.../documents/products/{id}
        const id = doc.name.split('/').pop();
        // Fallback to a default date if no update time is available
        const lastModified = doc.updateTime ? new Date(doc.updateTime) : new Date();

        return {
          url: `${baseUrl}/products/${id}`,
          lastModified: lastModified,
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      });

      routes.push(...productRoutes);
    }
  } catch (error) {
    console.error("Error generating sitemap for products:", error);
  }

  return routes;
}
