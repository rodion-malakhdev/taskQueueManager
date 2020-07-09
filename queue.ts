import * as os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';
import { IQueue, QueueListeners, QueueOptions, TaskResult } from "./interfaces";

class Queue implements IQueue {
    private tasks: any[] = [];
    private pendingTasks: any = {};
    private workers: any[] = [];
    private readonly cbPath: string;
    private readonly timeout: number;
    private readonly workerCount: number;
    private expectedCount: number = 0;
    private completedCount: number = 0;
    private listeners: any = {
        [QueueListeners.queueFree]: [],
        [QueueListeners.taskComplete]: [],
        [QueueListeners.taskFail]: [],
        [QueueListeners.taskCanceled]: [],
    }

    constructor({ workersCount = os.cpus().length, restartTimeout = 5000, cbPath }: QueueOptions) {
        this.timeout = restartTimeout;
        this.cbPath = cbPath;
        this.workerCount = workersCount;
    }

    public addTask(data: any){
        this.tasks.push(data);
        ++this.expectedCount;
        this.runFreeWorker();
    }

    public async run(){
        await this.initWorkers();
        this.workers.forEach((worker, i)=> this.registerTask(i));
    }

    public on(key: QueueListeners, cb: Function){
        this.listeners[key].push(cb);
    }

    public terminate(){
        this.workers.forEach((worker) => worker.terminate());
    }

    private async initWorkers(){
        this.workers = await Promise.all(
            new Array(this.workerCount).fill(null).map((d, i) => this.createWorker(i))
        );
    }

    private runFreeWorker(){
        const freeWorkerIndex = this.workers.findIndex(({ isBusy}) => !isBusy);
        if(freeWorkerIndex > -1){
            this.registerTask(freeWorkerIndex);
        }
    }

    private async exit(wInd: number){
        const task: any = Object.values(this.pendingTasks).find(({ workerIndex }: any) => wInd === workerIndex);
        if(task){
            this.listeners[QueueListeners.taskCanceled].forEach((cb: Function) => cb({ id: task.id }));
            this.workers[wInd] = await this.createWorker(wInd);
            this.insertTaskForRetry(task);
            this.runFreeWorker();
        }
    }

    private createWorker(i: number): Promise<Worker> {
        return new Promise((resolve) => {
            const { timeout, cbPath } = this;
            const workerData = { timeout, cbPath };
            const worker = new Worker(path.join(__dirname, 'worker.import.js'), { workerData });
            worker.on('message', this.complete.bind(this));
            worker.on('exit', this.exit.bind(this, i));
            worker.on('online', () => resolve(worker));
        });
    }

    private complete({ workerIndex, result, error, taskID }: TaskResult){
        this.workers[workerIndex].isBusy = false;
        if(result){
            delete this.pendingTasks[taskID];
            this.listeners[QueueListeners.taskComplete].forEach((cb: Function) => cb({ id: taskID, result}));
            ++this.completedCount;
            if(this.expectedCount === this.completedCount){
                this.listeners[QueueListeners.queueFree].forEach((cb: Function) => cb());
            } else {
                this.registerTask(workerIndex);
            }
        } else if(error) {
            const task = this.pendingTasks[taskID];
            delete this.pendingTasks[taskID];
            //For testing purpose
            task.error = false;
            this.listeners[QueueListeners.taskFail].forEach((cb: Function) => cb({ id: taskID, error }));
            this.insertTaskForRetry(task);
            this.registerTask(workerIndex);
        }
    }

    private insertTaskForRetry(task: any){
        this.tasks.splice(this.tasks.length / 2, 0, task);
    }

    private registerTask(i: number){
        const worker = this.workers[i];
        const pendingTask = this.tasks.shift();
        if(pendingTask){
            worker.isBusy = true;
            pendingTask.workerIndex = i;
            this.pendingTasks[pendingTask.id] = pendingTask;
            worker.postMessage(pendingTask);
        }
    }
}

export default Queue;
