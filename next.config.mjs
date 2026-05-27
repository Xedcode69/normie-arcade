/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.normies.art"
      }
    ]
  }
};

export default nextConfig;
