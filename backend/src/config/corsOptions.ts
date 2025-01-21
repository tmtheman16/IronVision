const whitelist: string[] = process.env.CORS_WHITELIST?.split(",") || [];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // if (whitelist.indexOf(origin!) !== -1 || !origin) {
    callback(null, true);
    // } else {
    //   callback(new Error("Not allowed by CORS"));
    // }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

export default corsOptions;
