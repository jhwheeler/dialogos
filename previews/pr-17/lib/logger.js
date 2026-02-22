export const loggerConfig = {
    transport: process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
            },
        }
        : undefined,
};
