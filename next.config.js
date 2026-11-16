/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "picsum.photos",
      "img.freepik.com",
      "res.cloudinary.com",
      "randomuser.me",
      "pbc-assets-bucket.s3.eu-north-1.amazonaws.com",
      "i.pravatar.cc",
      "placehold.co"
    ],
  },
  transpilePackages: ['@react-leaflet/core'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

module.exports = nextConfig;
