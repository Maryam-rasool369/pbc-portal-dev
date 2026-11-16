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
    ],
  },
  transpilePackages: ['@react-leaflet/core'],
};



module.exports = nextConfig;
