// Simulation of data processing
export default async function ({ input, error }: any) {
    return new Promise((res, rej) => {
        const random = Math.floor(Math.random() * (5500 - 100 + 1) + 100);
        setTimeout(() => error ? rej('Synthetic error') : res({ processed: input * input}), random);
    });
}
