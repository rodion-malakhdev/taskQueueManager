import { parentPort, workerData } from 'worker_threads';
if(parentPort){
    parentPort.on('message', async (data: any) => {
        let result: any;
        setTimeout(() => { !result && process.exit()}, workerData.timeout);
        if(parentPort){
            const handler = await import(workerData.cbPath);
            const { workerIndex, id : taskID, ...restData } = data;
            try {
                result = await handler.default(restData);
                parentPort.postMessage({ result, workerIndex, taskID });
            } catch (error) {
                parentPort.postMessage({ error, workerIndex, taskID });
            }
        }
    });
}