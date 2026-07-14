import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  verifyToken: process.env.VERIFY_TOKEN || "",
  appSecret: process.env.APP_SECRET || "",
  graphApiVersion: process.env.GRAPH_API_VERSION || "v21.0",
};

export const graphUrl = (path) =>
  `https://graph.facebook.com/${config.graphApiVersion}/${path}`;
