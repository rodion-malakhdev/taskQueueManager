export interface QueueOptions {
    cbPath: string,
    workersCount?: number,
    restartTimeout?: number
}

export interface TaskResult {
    workerIndex: number,
    taskID: string,
    result?: any,
    error?: any
}

export enum QueueListeners {
    taskComplete = 'taskComplete',
    taskFail = 'taskFail',
    queueFree = 'queueFree',
    taskCanceled = 'taskCanceled'
}

export interface IQueue {
    addTask: (data: any) => void;
    run: () => void;
    on: (listenerKey: QueueListeners, cb: Function) => void;
    terminate: () => void;

}