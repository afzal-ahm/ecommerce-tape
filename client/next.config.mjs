/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.r2.dev",
            },
            {
                protocol: "https",
                hostname: "**.digitaloceanspaces.com",
            },
            {
                protocol: "https",
                hostname: "**.cloudflare.com",
            }
        ]
    }
};

export default nextConfig;
