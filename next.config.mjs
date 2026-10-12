/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode double-invokes effects in development, which is exactly the
  // condition the Phaser host must survive without leaving a second canvas.
  reactStrictMode: true,
};

export default nextConfig;
