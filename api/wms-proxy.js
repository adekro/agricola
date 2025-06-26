// api/wms-proxy.js
import fetch from 'node-fetch'; // Or use global fetch if available in Vercel environment

export default async function handler(request, response) {
  const wmsBaseUrl = 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01/wmsinspirecatasto.asp';

  // Extract query parameters from the incoming request
  const { searchParams } = new URL(request.url, `http://${request.headers.host}`);

  // Construct the target WMS URL
  const targetUrl = new URL(wmsBaseUrl);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const wmsResponse = await fetch(targetUrl.toString(), {
      headers: {
        // Forward any necessary headers, or keep it simple
        // 'User-Agent': 'Agricola-App-Proxy/1.0', // Optional: identify your proxy
      }
    });

    // Check if the WMS server responded successfully
    if (!wmsResponse.ok) {
      // Forward the error status and message from WMS if possible
      const errorText = await wmsResponse.text();
      console.error(`WMS server error: ${wmsResponse.status} ${wmsResponse.statusText}`, errorText);
      response.status(wmsResponse.status).send(`Error from WMS server: ${wmsResponse.statusText}. ${errorText}`);
      return;
    }

    // Get content type from WMS response
    const contentType = wmsResponse.headers.get('content-type');
    if (contentType) {
      response.setHeader('Content-Type', contentType);
    }

    // Get cache control from WMS response and forward it
    const cacheControl = wmsResponse.headers.get('cache-control');
    if (cacheControl) {
      response.setHeader('Cache-Control', cacheControl);
    } else {
      // Default caching if not provided by WMS - adjust as needed
      response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // Cache for 1 hour
    }


    // Stream the response body (image) back to the client
    // For Vercel, you can pipe the stream directly.
    // If using Node.js http module, you'd pipe wmsResponse.body to response.

    // Convert ReadableStream to Buffer for Vercel response
    const imageBuffer = await wmsResponse.arrayBuffer();
    response.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('Proxy error:', error);
    response.status(500).send('Internal Server Error in Proxy');
  }
}
