import Queue from './queue';
import { QueueListeners } from "./interfaces";
import { green, red, blue, bold } from 'colors';

function completeTaskHandler({ id, result }: any) {
    console.log(green(`The task ${bold(id)} is completed with result: ${JSON.stringify(result)}`));
}

function failTaskHandler({ id, error }: any) {
    console.log(red(`The task ${bold(id)} is failed with error '${bold(error)}'`));
}

function cancelTaskHandler({ id }: any) {
    console.log(red(`The task ${bold(id)} is canceled by timeout`));
}

function freeQueueHandler() {
    console.log(blue(`All tasks are completed. The queue is free`));
}

function fillQueueRandomData(q: Queue) {
    new Array(20).fill(null).forEach((_, input ) => {
        q.addTask({id: input, error: Math.random() > 0.9, input })
    })
}

const q = new Queue({ cbPath: './handler' });
q.on(QueueListeners.taskComplete, completeTaskHandler);
q.on(QueueListeners.taskFail, failTaskHandler);
q.on(QueueListeners.queueFree, freeQueueHandler);
q.on(QueueListeners.taskCanceled, cancelTaskHandler);
fillQueueRandomData(q);

q.run();


//Possible to use runtime addition of tasks and terminate all queue processes
// setTimeout(() => {
//     q.addTask({id: 'taskWithDelayedStart', error: true, input: 2 });
// }, 20000);
//
// setTimeout(() => {
//     q.terminate();
//     console.log(blue(`The queue is terminated`));
// }, 25000);

